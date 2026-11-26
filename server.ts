import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  createAuthMiddleware,
  hashPassword,
  signAuthToken,
  toPublicUser,
  verifyAdminPasscode,
  verifyAuthToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './server/auth.ts';
import { buildReportCsv, generateLibraryReport } from './server/reports.ts';
import { libraryStore } from './server/store.ts';
import type { ActivityLog, PublicUser, ReportFrequency, WsEvent } from './src/types.ts';

interface ClientSocket {
  ws: WebSocket;
  user: PublicUser | null;
}

const clients = new Set<ClientSocket>();

function sendWs(ws: WebSocket, event: WsEvent): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

function redactActivityForPublic(activity: ActivityLog): ActivityLog {
  if (activity.actorRole === 'member') {
    return {
      ...activity,
      actorName: 'Anggota KAJILIB',
      summary: activity.summary.replace(activity.actorName, 'Anggota KAJILIB'),
    };
  }
  return activity;
}

function broadcastEvent(
  type: WsEvent['type'],
  payload: unknown,
  options?: {
    audience?: 'public' | 'admin' | 'member-and-admin';
    targetMemberId?: string;
    activityForBroadcast?: ActivityLog;
  }
): void {
  const timestamp = new Date().toISOString();
  const audience = options?.audience ?? 'public';

  for (const client of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue;

    if (audience === 'admin') {
      if (client.user?.role === 'admin') {
        sendWs(client.ws, { type, payload, timestamp });
      }
      continue;
    }

    if (audience === 'member-and-admin') {
      const isAdmin = client.user?.role === 'admin';
      const isTargetMember =
        Boolean(options?.targetMemberId) && client.user?.id === options?.targetMemberId;
      if (isAdmin || isTargetMember) {
        sendWs(client.ws, { type, payload, timestamp });
      }
      continue;
    }

    if (type === 'activity:new' && options?.activityForBroadcast) {
      const act = options.activityForBroadcast;
      const isAdmin = client.user?.role === 'admin';
      const isOwner = client.user?.id === act.actorId;
      sendWs(client.ws, {
        type,
        payload: isAdmin || isOwner ? act : redactActivityForPublic(act),
        timestamp,
      });
      continue;
    }

    sendWs(client.ws, { type, payload, timestamp });
  }
}

function sanitizeImageUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/src/assets/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

async function startServer(): Promise<void> {
  await libraryStore.init();

  // Ensure an initial automated baseline report exists on first boot
  if (libraryStore.getReports().length === 0) {
    await generateLibraryReport({
      trigger: 'scheduled',
      frequency: 'daily',
      generatedBy: 'Sistem Pelaporan Otomatis KAJILIB',
    });
  }

  const app = express();
  app.use(express.json({ limit: '512kb' }));

  const { requireAuth, requireAdmin, optionalAuth } = createAuthMiddleware((id) =>
    libraryStore.getUserById(id)
  );

  // --- Health & Bootstrap Status ---
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'kajilib' });
  });

  app.get('/api/auth/bootstrap-status', (_req, res) => {
    const envPasscodeConfigured = Boolean(process.env.ADMIN_PASSCODE?.trim());
    const adminClaimed = libraryStore.hasAdminUser();
    res.json({
      adminClaimed,
      envPasscodeConfigured,
      canClaimFirstAdmin: !envPasscodeConfigured && !adminClaimed,
    });
  });

  // --- Authentication Routes ---
  app.post('/api/auth/claim-admin', async (req, res) => {
    const envPasscodeConfigured = Boolean(process.env.ADMIN_PASSCODE?.trim());
    if (envPasscodeConfigured || libraryStore.hasAdminUser()) {
      res.status(403).json({
        error: 'Akun administrator sudah diaktifkan. Silakan masuk melalui form login admin.',
      });
      return;
    }

    const { name, email, password } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      res.status(400).json({ error: 'Nama administrator harus terdiri dari 2–80 karakter.' });
      return;
    }
    if (typeof email !== 'string' || !isValidEmail(email)) {
      res.status(400).json({ error: 'Format alamat email tidak valid.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Kata sandi minimal 8 karakter.' });
      return;
    }
    if (libraryStore.getUserByEmail(email)) {
      res.status(409).json({ error: 'Email tersebut sudah terdaftar.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const adminUser = await libraryStore.createUser({
      name,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      role: 'admin',
    });

    const publicUser = toPublicUser(adminUser);
    const token = signAuthToken(publicUser);
    res.status(201).json({ user: publicUser, token });
  });

  app.post('/api/auth/admin-passcode', async (req, res) => {
    const { passcode, name, email } = req.body ?? {};
    if (!process.env.ADMIN_PASSCODE?.trim()) {
      res.status(400).json({ error: 'Mode kode akses admin tidak aktif di konfigurasi server.' });
      return;
    }
    if (typeof passcode !== 'string' || !verifyAdminPasscode(passcode)) {
      res.status(401).json({ error: 'Kode akses administrator tidak valid.' });
      return;
    }

    const targetEmail =
      typeof email === 'string' && isValidEmail(email)
        ? email.trim().toLowerCase()
        : 'admin@kajilib.local';
    let adminUser = libraryStore.getUserByEmail(targetEmail);
    if (!adminUser) {
      const { hash, salt } = hashPassword(crypto.randomBytes(24).toString('hex'));
      adminUser = await libraryStore.createUser({
        name: typeof name === 'string' && name.trim().length >= 2 ? name.trim() : 'Administrator KAJILIB',
        email: targetEmail,
        passwordHash: hash,
        passwordSalt: salt,
        role: 'admin',
      });
    } else if (adminUser.role !== 'admin') {
      res.status(403).json({ error: 'Email tersebut terdaftar sebagai anggota biasa.' });
      return;
    }

    const publicUser = toPublicUser(adminUser);
    const token = signAuthToken(publicUser);
    res.json({ user: publicUser, token });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      res.status(400).json({ error: 'Nama lengkap harus terdiri dari 2–80 karakter.' });
      return;
    }
    if (typeof email !== 'string' || !isValidEmail(email)) {
      res.status(400).json({ error: 'Format alamat email tidak valid.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      return;
    }
    if (libraryStore.getUserByEmail(email)) {
      res.status(409).json({ error: 'Alamat email sudah terdaftar. Silakan masuk.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const user = await libraryStore.createUser({
      name,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      role: 'member',
    });

    const publicUser = toPublicUser(user);
    const token = signAuthToken(publicUser);
    broadcastEvent('stats:updated', libraryStore.getStats());
    broadcastEvent('member:updated', libraryStore.getMembersDirectory(), { audience: 'admin' });
    res.status(201).json({ user: publicUser, token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      return;
    }
    const user = libraryStore.getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Email atau kata sandi salah.' });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Akun Anda sedang ditangguhkan oleh administrator.' });
      return;
    }
    const publicUser = toPublicUser(user);
    const token = signAuthToken(publicUser);
    res.json({ user: publicUser, token });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.authUser });
  });

  // --- Stats & Public Catalog ---
  app.get('/api/stats', (_req, res) => {
    res.json(libraryStore.getStats());
  });

  app.get('/api/books', (_req, res) => {
    res.json(libraryStore.getBooks());
  });

  app.post('/api/books', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    const b = req.body ?? {};
    const title = typeof b.title === 'string' ? b.title.trim() : '';
    const author = typeof b.author === 'string' ? b.author.trim() : '';
    const isbn = typeof b.isbn === 'string' ? b.isbn.trim() : '';
    const category = typeof b.category === 'string' ? b.category.trim() : '';
    const publisher = typeof b.publisher === 'string' ? b.publisher.trim() : 'Pustaka KAJILIB';
    const shelfCode = typeof b.shelfCode === 'string' ? b.shelfCode.trim() : 'R-01-A';
    const ddcCode = typeof b.ddcCode === 'string' ? b.ddcCode.trim() : '000';
    const synopsis = typeof b.synopsis === 'string' ? b.synopsis.trim() : '';
    const excerptTitle =
      typeof b.excerptTitle === 'string' && b.excerptTitle.trim()
        ? b.excerptTitle.trim()
        : 'Bab 1: Pengantar Koleksi';
    const excerptContent =
      typeof b.excerptContent === 'string' && b.excerptContent.trim()
        ? b.excerptContent.trim()
        : synopsis || 'Cuplikan digital belum tersedia untuk koleksi ini.';

    const year = Number(b.year);
    const pages = Number(b.pages) || 200;
    const totalCopies = Number(b.totalCopies);

    if (title.length < 2 || title.length > 180) {
      res.status(400).json({ error: 'Judul buku harus 2–180 karakter.' });
      return;
    }
    if (author.length < 2 || author.length > 120) {
      res.status(400).json({ error: 'Nama penulis harus 2–120 karakter.' });
      return;
    }
    if (isbn.length < 5 || isbn.length > 40) {
      res.status(400).json({ error: 'ISBN harus 5–40 karakter.' });
      return;
    }
    if (!category) {
      res.status(400).json({ error: 'Kategori wajib dipilih.' });
      return;
    }
    if (!Number.isInteger(year) || year < 1800 || year > 2100) {
      res.status(400).json({ error: 'Tahun terbit tidak valid (1800–2100).' });
      return;
    }
    if (!Number.isInteger(totalCopies) || totalCopies < 1 || totalCopies > 500) {
      res.status(400).json({ error: 'Jumlah eksemplar harus antara 1 dan 500.' });
      return;
    }

    const result = await libraryStore.addBook(
      {
        title,
        author,
        isbn,
        category,
        publisher,
        year,
        pages: Math.max(1, Math.min(5000, Math.round(pages))),
        shelfCode,
        ddcCode,
        coverUrl: sanitizeImageUrl(b.coverUrl),
        synopsis: synopsis.slice(0, 1500),
        excerptTitle: excerptTitle.slice(0, 200),
        excerptContent: excerptContent.slice(0, 5000),
        totalCopies,
      },
      req.authUser!
    );

    broadcastEvent('book:created', result.book);
    broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
    broadcastEvent('stats:updated', libraryStore.getStats());
    res.status(201).json(result.book);
  });

  app.patch('/api/books/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    const b = req.body ?? {};
    const patch: Record<string, unknown> = {};

    if (b.title !== undefined) {
      const val = String(b.title).trim();
      if (val.length < 2 || val.length > 180) {
        res.status(400).json({ error: 'Judul buku harus 2–180 karakter.' });
        return;
      }
      patch.title = val;
    }
    if (b.author !== undefined) patch.author = String(b.author).trim().slice(0, 120);
    if (b.isbn !== undefined) patch.isbn = String(b.isbn).trim().slice(0, 40);
    if (b.category !== undefined) patch.category = String(b.category).trim().slice(0, 80);
    if (b.publisher !== undefined) patch.publisher = String(b.publisher).trim().slice(0, 120);
    if (b.shelfCode !== undefined) patch.shelfCode = String(b.shelfCode).trim().slice(0, 32);
    if (b.ddcCode !== undefined) patch.ddcCode = String(b.ddcCode).trim().slice(0, 32);
    if (b.synopsis !== undefined) patch.synopsis = String(b.synopsis).trim().slice(0, 1500);
    if (b.excerptTitle !== undefined) patch.excerptTitle = String(b.excerptTitle).trim().slice(0, 200);
    if (b.excerptContent !== undefined) patch.excerptContent = String(b.excerptContent).trim().slice(0, 5000);
    if (b.coverUrl !== undefined) patch.coverUrl = sanitizeImageUrl(b.coverUrl);
    if (b.year !== undefined) {
      const year = Number(b.year);
      if (!Number.isInteger(year) || year < 1800 || year > 2100) {
        res.status(400).json({ error: 'Tahun terbit tidak valid.' });
        return;
      }
      patch.year = year;
    }
    if (b.pages !== undefined) {
      const pages = Number(b.pages);
      if (!Number.isInteger(pages) || pages < 1 || pages > 5000) {
        res.status(400).json({ error: 'Jumlah halaman tidak valid.' });
        return;
      }
      patch.pages = pages;
    }
    if (b.totalCopies !== undefined) {
      const totalCopies = Number(b.totalCopies);
      if (!Number.isInteger(totalCopies) || totalCopies < 1 || totalCopies > 500) {
        res.status(400).json({ error: 'Jumlah eksemplar harus antara 1 dan 500.' });
        return;
      }
      patch.totalCopies = totalCopies;
    }

    const result = await libraryStore.updateBook(req.params.id, patch, req.authUser!);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    broadcastEvent('book:updated', result.book);
    broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
    broadcastEvent('stats:updated', libraryStore.getStats());
    res.json(result.book);
  });

  app.delete('/api/books/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    const result = await libraryStore.deleteBook(req.params.id, req.authUser!);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    broadcastEvent('book:deleted', { id: result.deletedId });
    broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
    broadcastEvent('stats:updated', libraryStore.getStats());
    res.json({ deletedId: result.deletedId });
  });

  // --- Loans & Circulation ---
  app.get('/api/loans', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const loans = user.role === 'admin' ? libraryStore.getLoans() : libraryStore.getLoans(user.id);
    res.json(loans);
  });

  app.post('/api/loans', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { bookId, days } = req.body ?? {};
    if (typeof bookId !== 'string' || !bookId.trim()) {
      res.status(400).json({ error: 'ID buku wajib disertakan.' });
      return;
    }
    const loanDays =
      typeof days === 'number' && Number.isInteger(days) && days >= 3 && days <= 14 ? days : 7;

    const result = await libraryStore.borrowBook(bookId.trim(), req.authUser!, loanDays);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    broadcastEvent('book:updated', result.book);
    broadcastEvent('loan:created', result.loan, {
      audience: 'member-and-admin',
      targetMemberId: result.loan.memberId,
    });
    broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
    broadcastEvent('stats:updated', libraryStore.getStats());
    if (req.authUser!.role === 'member') {
      broadcastEvent('member:updated', libraryStore.getMembersDirectory(), { audience: 'admin' });
    }
    res.status(201).json(result.loan);
  });

  app.post('/api/loans/:id/return', requireAuth, async (req: AuthenticatedRequest, res) => {
    const result = await libraryStore.returnLoan(req.params.id, req.authUser!);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    broadcastEvent('book:updated', result.book);
    broadcastEvent('loan:updated', result.loan, {
      audience: 'member-and-admin',
      targetMemberId: result.loan.memberId,
    });
    if (result.promotedReservation) {
      broadcastEvent('reservation:updated', result.promotedReservation, {
        audience: 'member-and-admin',
        targetMemberId: result.promotedReservation.memberId,
      });
    }
    broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
    broadcastEvent('stats:updated', libraryStore.getStats());
    broadcastEvent('member:updated', libraryStore.getMembersDirectory(), { audience: 'admin' });
    res.json(result.loan);
  });

  app.post('/api/loans/:id/renew', requireAuth, async (req: AuthenticatedRequest, res) => {
    const result = await libraryStore.renewLoan(req.params.id, req.authUser!);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    broadcastEvent('loan:updated', result.loan, {
      audience: 'member-and-admin',
      targetMemberId: result.loan.memberId,
    });
    broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
    broadcastEvent('stats:updated', libraryStore.getStats());
    res.json(result.loan);
  });

  // --- Reservations ---
  app.get('/api/reservations', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const list =
      user.role === 'admin'
        ? libraryStore.getReservations()
        : libraryStore.getReservations(user.id);
    res.json(list);
  });

  app.post('/api/reservations', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { bookId } = req.body ?? {};
    if (typeof bookId !== 'string' || !bookId.trim()) {
      res.status(400).json({ error: 'ID buku wajib disertakan.' });
      return;
    }
    const result = await libraryStore.createReservation(bookId.trim(), req.authUser!);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    broadcastEvent('reservation:updated', result.reservation, {
      audience: 'member-and-admin',
      targetMemberId: result.reservation.memberId,
    });
    broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
    broadcastEvent('stats:updated', libraryStore.getStats());
    res.status(201).json(result.reservation);
  });

  app.delete('/api/reservations/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    const result = await libraryStore.cancelReservation(req.params.id, req.authUser!);
    if ('error' in result) {
      res.status(result.status ?? 400).json({ error: result.error });
      return;
    }

    broadcastEvent('reservation:updated', result.reservation, {
      audience: 'member-and-admin',
      targetMemberId: result.reservation.memberId,
    });
    broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
    broadcastEvent('stats:updated', libraryStore.getStats());
    res.json(result.reservation);
  });

  // --- Activities (Real-Time Feed) ---
  app.get('/api/activities', optionalAuth, (req: AuthenticatedRequest, res) => {
    res.json(libraryStore.getActivities(req.authUser));
  });

  // --- Members Directory (Admin Only) ---
  app.get('/api/members', requireAuth, requireAdmin, (_req, res) => {
    res.json(libraryStore.getMembersDirectory());
  });

  app.patch('/api/members/:id/status', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    const { status } = req.body ?? {};
    if (status !== 'active' && status !== 'suspended') {
      res.status(400).json({ error: 'Status anggota harus active atau suspended.' });
      return;
    }
    const result = await libraryStore.updateMemberStatus(req.params.id, status, req.authUser!);
    if (!result) {
      res.status(404).json({ error: 'Anggota tidak ditemukan.' });
      return;
    }
    broadcastEvent('member:updated', libraryStore.getMembersDirectory(), { audience: 'admin' });
    broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
    res.json(toPublicUser(result.member));
  });

  // --- Automated Reporting System (Admin Only) ---
  app.get('/api/reports', requireAuth, requireAdmin, (_req, res) => {
    res.json({
      reports: libraryStore.getReports(),
      schedule: libraryStore.getReportSchedule(),
    });
  });

  app.post('/api/reports/generate', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    const freq = req.body?.frequency;
    const validFreq: ReportFrequency | 'manual' =
      freq === 'daily' || freq === 'weekly' || freq === 'monthly' ? freq : 'manual';
    const result = await generateLibraryReport({
      trigger: 'manual',
      frequency: validFreq,
      generatedBy: req.authUser!.name,
    });

    broadcastEvent('report:generated', result.report, { audience: 'admin' });
    broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
    res.status(201).json(result.report);
  });

  app.patch('/api/reports/schedule', requireAuth, requireAdmin, async (req, res) => {
    const { enabled, frequency } = req.body ?? {};
    const patch: { enabled?: boolean; frequency?: ReportFrequency } = {};
    if (typeof enabled === 'boolean') patch.enabled = enabled;
    if (frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') {
      patch.frequency = frequency;
    }
    const updated = await libraryStore.updateReportSchedule(patch);
    res.json(updated);
  });

  app.get('/api/reports/:id/csv', requireAuth, requireAdmin, (req, res) => {
    const report = libraryStore.getReportById(req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Laporan tidak ditemukan.' });
      return;
    }
    const csv = buildReportCsv(report);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportCode}.csv"`);
    res.send(csv);
  });

  // --- Vite Middleware / Static Production Assets ---
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use('/src/assets', express.static(path.resolve(distDir, 'src/assets')));
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const client: ClientSocket = { ws, user: null };
    clients.add(client);

    sendWs(ws, {
      type: 'connected',
      payload: { connectedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string; token?: string };
        if (msg.type === 'auth') {
          if (!msg.token) {
            client.user = null;
            return;
          }
          const payload = verifyAuthToken(msg.token);
          if (payload) {
            const user = libraryStore.getUserById(payload.sub);
            if (user && user.status === 'active') {
              client.user = toPublicUser(user);
            }
          }
        }
      } catch {
        // Ignore malformed client messages
      }
    });

    ws.on('close', () => {
      clients.delete(client);
    });
  });

  // Background scheduler for automated periodic reports (checks every 60s)
  setInterval(async () => {
    try {
      const schedule = libraryStore.getReportSchedule();
      if (!schedule.enabled || !schedule.nextScheduledAt) return;
      if (Date.now() >= new Date(schedule.nextScheduledAt).getTime()) {
        const result = await generateLibraryReport({
          trigger: 'scheduled',
          frequency: schedule.frequency,
          generatedBy: 'Sistem Pelaporan Otomatis KAJILIB',
        });
        broadcastEvent('report:generated', result.report, { audience: 'admin' });
        broadcastEvent('activity:new', result.activity, { activityForBroadcast: result.activity });
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  }, 60_000);

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`KAJILIB server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start KAJILIB server:', err);
  process.exit(1);
});
