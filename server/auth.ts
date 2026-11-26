import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { PublicUser, StoredUser, UserRole } from '../src/types.ts';

const RUNTIME_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  return configured && configured.length >= 16 ? configured : RUNTIME_SECRET;
}

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, storedSalt, 64);
    const target = Buffer.from(storedHash, 'hex');
    if (derived.length !== target.length) return false;
    return crypto.timingSafeEqual(derived, target);
  } catch {
    return false;
  }
}

export function verifyAdminPasscode(input: string): boolean {
  const expected = process.env.ADMIN_PASSCODE?.trim();
  if (!expected) return false;
  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface TokenPayload {
  sub: string;
  role: UserRole;
  name: string;
  email: string;
  memberCode: string;
  exp: number;
}

export function signAuthToken(user: Pick<PublicUser, 'id' | 'role' | 'name' | 'email' | 'memberCode'>): string {
  const payload: TokenPayload = {
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    memberCode: user.memberCode,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyAuthToken(token: string | undefined | null): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed || typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number') {
      return null;
    }
    if (Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    memberCode: user.memberCode,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    joinedAt: user.joinedAt,
  };
}

export interface AuthenticatedRequest extends Request {
  authUser?: PublicUser;
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export function createAuthMiddleware(getUserById: (id: string) => StoredUser | undefined) {
  return {
    requireAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const token = extractBearerToken(req);
      const payload = verifyAuthToken(token);
      if (!payload) {
        res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.' });
        return;
      }
      const user = getUserById(payload.sub);
      if (!user) {
        res.status(401).json({ error: 'Akun pengguna tidak ditemukan.' });
        return;
      }
      if (user.status === 'suspended') {
        res.status(403).json({ error: 'Akun keanggotaan Anda sedang ditangguhkan oleh administrator.' });
        return;
      }
      req.authUser = toPublicUser(user);
      next();
    },
    requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.authUser || req.authUser.role !== 'admin') {
        res.status(403).json({ error: 'Akses ditolak. Fitur ini khusus administrator perpustakaan.' });
        return;
      }
      next();
    },
    optionalAuth: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      const token = extractBearerToken(req);
      const payload = verifyAuthToken(token);
      if (payload) {
        const user = getUserById(payload.sub);
        if (user && user.status === 'active') {
          req.authUser = toPublicUser(user);
        }
      }
      next();
    },
  };
}
