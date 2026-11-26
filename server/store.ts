import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ActivityLog,
  ActivityType,
  AutoReport,
  Book,
  LibraryStats,
  Loan,
  MemberDirectoryItem,
  PublicUser,
  ReportScheduleConfig,
  Reservation,
  StoredUser,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'kajilib-db.json');
const FINE_PER_DAY_RP = 2000;
const DEFAULT_LOAN_DAYS = 7;

interface DatabaseSchema {
  books: Book[];
  users: StoredUser[];
  loans: Loan[];
  reservations: Reservation[];
  activities: ActivityLog[];
  reports: AutoReport[];
  reportSchedule: ReportScheduleConfig;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function buildSeedData(): DatabaseSchema {
  const t0 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString();
  const t1 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString();
  const t2 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString();
  const tOverdueBorrow = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString();
  const tOverdueDue = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString();

  const books: Book[] = [
    {
      id: 'bk-001',
      title: 'Arsitektur Sistem & Algoritma Modern',
      author: 'Dr. Hendra Kusuma',
      isbn: '978-602-481-104-2',
      category: 'Teknologi & Rekayasa',
      publisher: 'Pustaka Cendekia Nusantara',
      year: 2025,
      pages: 412,
      shelfCode: 'R-01-A',
      ddcCode: '005.1',
      coverUrl: '/src/assets/images/cover_algoritma_sistem_1795661240053.jpg',
      synopsis:
        'Panduan komprehensif merancang sistem terdistribusi yang tangguh, struktur data berkinerja tinggi, dan pola arsitektur perangkat lunak skala institusi.',
      excerptTitle: 'Bab 1: Fondasi Konsistensi & Reliabilitas Data',
      excerptContent:
        'Setiap sistem informasi perpustakaan modern bertumpu pada satu prinsip utama: kebenaran data inventaris harus terjaga bahkan ketika ribuan permintaan sirkulasi terjadi bersamaan. Pada bab ini kita membedah teknik penguncian atomik, pencatatan log transaksi yang tidak dapat diubah, serta strategi sinkronisasi waktu-nyata menggunakan kanal komunikasi dua arah.\n\nDengan memisahkan antara pembacaan katalog berkecepatan tinggi dan mutasi status peminjaman yang tervalidasi di sisi server, pengelola dapat memastikan tidak ada eksemplar buku yang terpinjam ganda (double-lending) di saat bersamaan.',
      totalCopies: 5,
      availableCopies: 4,
      borrowCount: 28,
      createdAt: t0,
      updatedAt: t2,
    },
    {
      id: 'bk-002',
      title: 'Jejak Kartografi & Sejarah Maritim Nusantara',
      author: 'Prof. Ratna Sari Dewi',
      isbn: '978-623-219-088-5',
      category: 'Sejarah & Budaya',
      publisher: 'Balai Aksara Bahari',
      year: 2024,
      pages: 356,
      shelfCode: 'R-03-B',
      ddcCode: '959.8',
      coverUrl: '/src/assets/images/cover_sejarah_maritim_1795661240510.jpg',
      synopsis:
        'Menelusuri peta-peta kuno abad ke-15 hingga ke-18, jalur perdagangan rempah, serta perkembangan teknologi navigasi pelaut Nusantara.',
      excerptTitle: 'Bab 2: Membaca Arah Angin Muson di Selat Malaka',
      excerptContent:
        'Sebelum kompas magnetik dikenal luas di perairan tropis, para nakhoda Nusantara mengandalkan pembacaan rasi bintang selatan, arus pasang surut musiman, serta catatan lisan mengenai kedalaman selat. Manuskrip-manuskrip pelayaran yang tersimpan di arsip pelabuhan lama memperlihatkan betapa presisinya pengetahuan astronomi lokal.\n\nKajian ini memadukan temuan arkeologi bawah laut dengan analisis kartografi komparatif untuk merekonstruksi jaringan pelabuhan dagang kosmopolitan di kepulauan.',
      totalCopies: 3,
      availableCopies: 2,
      borrowCount: 19,
      createdAt: t0,
      updatedAt: t1,
    },
    {
      id: 'bk-003',
      title: 'Ekologi Hutan Tropis & Konservasi Hayati',
      author: 'Dr. Bagas Prakoso',
      isbn: '978-602-774-512-9',
      category: 'Ekologi & Sains',
      publisher: 'Lestari Press',
      year: 2025,
      pages: 298,
      shelfCode: 'R-02-C',
      ddcCode: '577.3',
      coverUrl: '/src/assets/images/cover_ekologi_nusantara_1795661240321.jpg',
      synopsis:
        'Studi lapangan tentang dinamika kanopi hutan hujan tropis, jaringan mikoriza tanah, dan strategi restorasi ekosistem berkelanjutan.',
      excerptTitle: 'Bab 1: Simbiosis di Bawah Permukaan Hutan',
      excerptContent:
        'Hutan hujan tropis bukan sekadar kumpulan pohon raksasa yang bersaing memperebutkan cahaya matahari. Di bawah lapisan serasah daun yang lembap, jaringan hifa jamur membentuk saluran pertukaran nutrisi yang menghubungkan akar-akar berbagai spesies tumbuhan.\n\nPemahaman mengenai jejaring biologis ini menjadi kunci keberhasilan program rehabilitasi lahan kritis dan pelestarian keanekaragaman hayati endemik.',
      totalCopies: 4,
      availableCopies: 4,
      borrowCount: 15,
      createdAt: t0,
      updatedAt: t0,
    },
    {
      id: 'bk-004',
      title: 'Senja di Gerbang Kota Tua: Antologi Sastra',
      author: 'Nadia Paramitha',
      isbn: '978-623-501-330-1',
      category: 'Sastra & Humaniora',
      publisher: 'Ruang Kata Merdeka',
      year: 2023,
      pages: 244,
      shelfCode: 'R-04-A',
      ddcCode: '899.2',
      coverUrl: '/src/assets/images/cover_sastra_kontemporer_1795661240212.jpg',
      synopsis:
        'Kumpulan cerita pendek dan esai liris mengenai ingatan kolektif warga kota, ruang publik yang berubah, serta percakapan di sudut stasiun tua.',
      excerptTitle: 'Bagian I: Bangku Kayu di Pelataran Arsip',
      excerptContent:
        'Hujan sore selalu datang tanpa permisi di bulan November, mengetuk jendela-jendela tinggi gedung arsip yang cat putihnya mulai terkelupas. Di meja nomor empat, seorang peneliti muda menyusun surat kabar terbitan tahun lima puluhan dengan pinset bambu.\n\nSetiap lembar kertas menyimpan bau waktu, tinta cetak yang sedikit pudar, dan suara-suara kota yang pernah hidup di persimpangan jalan berbatu.',
      totalCopies: 2,
      availableCopies: 0,
      borrowCount: 34,
      createdAt: t0,
      updatedAt: t2,
    },
    {
      id: 'bk-005',
      title: 'Ekonomi Sirkular & Kebijakan Publik Berkelanjutan',
      author: 'Dr. Adi Nugroho, M.Ec.',
      isbn: '978-602-883-910-4',
      category: 'Ekonomi & Kebijakan',
      publisher: 'Institut Kajian Pembangunan',
      year: 2026,
      pages: 320,
      shelfCode: 'R-05-D',
      ddcCode: '338.9',
      coverUrl: '/src/assets/images/cover_ekologi_nusantara_1795661240321.jpg',
      synopsis:
        'Analisis kuantitatif dan studi kasus penerapan model ekonomi sirkular pada industri manufaktur, pengelolaan air kota, dan rantai pasok pangan.',
      excerptTitle: 'Bab 3: Mengukur Nilai Residu dalam Rantai Pasok',
      excerptContent:
        'Model ekonomi linier tradisional mengasumsikan ketersediaan sumber daya tanpa batas dan kapasitas serap lingkungan yang tak terbatas. Melalui kerangka ekonomi sirkular, limbah produksi dari satu sektor dirancang ulang menjadi bahan baku bernilai tambah bagi sektor lainnya.\n\nBuku ini menyajikan instrumen kebijakan fiskal dan indikator pelaporan yang dapat diterapkan langsung oleh pemerintah daerah maupun pelaku industri menengah.',
      totalCopies: 3,
      availableCopies: 3,
      borrowCount: 11,
      createdAt: t1,
      updatedAt: t1,
    },
    {
      id: 'bk-006',
      title: 'Rekayasa Antarmuka & Tipografi Informasi',
      author: 'Siti Rahmawati, M.Ds.',
      isbn: '978-623-410-221-7',
      category: 'Teknologi & Rekayasa',
      publisher: 'Studio Aksara Digital',
      year: 2025,
      pages: 276,
      shelfCode: 'R-01-C',
      ddcCode: '006.7',
      coverUrl: '/src/assets/images/cover_algoritma_sistem_1795661240053.jpg',
      synopsis:
        'Prinsip desain informasi, tata letak grid editorial, keterbacaan angka tabular pada dashboard analitik, dan aksesibilitas antarmuka web modern.',
      excerptTitle: 'Bab 4: Disiplin Numerik dan Keterbacaan Tabel',
      excerptContent:
        'Dalam sistem analitik maupun katalog perpustakaan, angka bukan sekadar hiasan—ia adalah penunjuk keputusan. Penggunaan angka tabular memastikan setiap digit pada kolom tanggal jatuh tempo, kode ISBN, dan jumlah eksemplar sejajar secara vertikal sehingga mata pembaca dapat memindai data tanpa kelelahan kognitif.',
      totalCopies: 4,
      availableCopies: 3,
      borrowCount: 22,
      createdAt: t1,
      updatedAt: t2,
    },
    {
      id: 'bk-007',
      title: 'Filsafat Pengetahuan & Etika Riset Digital',
      author: 'Prof. Gunawan Wibisono',
      isbn: '978-602-119-740-0',
      category: 'Sastra & Humaniora',
      publisher: 'Pustaka Cendekia Nusantara',
      year: 2024,
      pages: 310,
      shelfCode: 'R-04-B',
      ddcCode: '121.4',
      coverUrl: '/src/assets/images/cover_sastra_kontemporer_1795661240212.jpg',
      synopsis:
        'Refleksi kritis mengenai epistemologi di era repositori digital terbuka, hak akses pengetahuan publik, dan integritas sitasi ilmiah.',
      excerptTitle: 'Bab 1: Perpustakaan sebagai Ruang Demokrasi Ilmu',
      excerptContent:
        'Sejak perpustakaan Alexandria hingga repositori digital masa kini, misi utama lembaga pustaka tetap sama: merawat memori intelektual umat manusia agar dapat diakses secara adil lintas generasi. Bab pembuka ini mengulas tantangan pelestarian arsip digital dan etika keterbukaan data ilmiah.',
      totalCopies: 3,
      availableCopies: 3,
      borrowCount: 14,
      createdAt: t0,
      updatedAt: t0,
    },
    {
      id: 'bk-008',
      title: 'Tata Kelola Perpustakaan & Otomasi Sirkulasi',
      author: 'Dra. Larasati Wulandari',
      isbn: '978-623-778-019-3',
      category: 'Ekonomi & Kebijakan',
      publisher: 'Asosiasi Pustakawan Indonesia',
      year: 2025,
      pages: 264,
      shelfCode: 'R-05-A',
      ddcCode: '025.6',
      coverUrl: '/src/assets/images/cover_sejarah_maritim_1795661240510.jpg',
      synopsis:
        'Standar operasional klasifikasi DDC, manajemen stok koleksi hibrida, serta penyusunan laporan statistik sirkulasi berkala.',
      excerptTitle: 'Bab 5: Pelaporan Otomatis & Evaluasi Utilisasi Koleksi',
      excerptContent:
        'Pelaporan sirkulasi yang akurat memungkinkan kepala perpustakaan menentukan buku mana yang perlu ditambah eksemplarnya dan kategori mana yang membutuhkan sosialisasi lebih lanjut kepada anggota. Otomasi rekapitulasi harian mengurangi beban administratif pustakawan hingga tujuh puluh persen.',
      totalCopies: 2,
      availableCopies: 2,
      borrowCount: 9,
      createdAt: t2,
      updatedAt: t2,
    },
  ];

  // Historical archival circulation logs (non-login archival records so initial analytics & reports are populated)
  const loans: Loan[] = [
    {
      id: 'ln-hist-001',
      loanCode: 'PJM-2026-001',
      bookId: 'bk-001',
      bookTitle: 'Arsitektur Sistem & Algoritma Modern',
      bookAuthor: 'Dr. Hendra Kusuma',
      shelfCode: 'R-01-A',
      memberId: 'archive-member-01',
      memberCode: 'AGT-0001',
      memberName: 'Arsip Anggota #0001',
      borrowedAt: t1,
      dueAt: addDaysIso(t1, 7),
      returnedAt: null,
      renewCount: 0,
      maxRenewals: 2,
      fineAmount: 0,
      status: 'borrowed',
    },
    {
      id: 'ln-hist-002',
      loanCode: 'PJM-2026-002',
      bookId: 'bk-004',
      bookTitle: 'Senja di Gerbang Kota Tua: Antologi Sastra',
      bookAuthor: 'Nadia Paramitha',
      shelfCode: 'R-04-A',
      memberId: 'archive-member-02',
      memberCode: 'AGT-0002',
      memberName: 'Arsip Anggota #0002',
      borrowedAt: tOverdueBorrow,
      dueAt: tOverdueDue,
      returnedAt: null,
      renewCount: 0,
      maxRenewals: 2,
      fineAmount: 6000,
      status: 'overdue',
    },
    {
      id: 'ln-hist-003',
      loanCode: 'PJM-2026-003',
      bookId: 'bk-004',
      bookTitle: 'Senja di Gerbang Kota Tua: Antologi Sastra',
      bookAuthor: 'Nadia Paramitha',
      shelfCode: 'R-04-A',
      memberId: 'archive-member-03',
      memberCode: 'AGT-0003',
      memberName: 'Arsip Anggota #0003',
      borrowedAt: t2,
      dueAt: addDaysIso(t2, 7),
      returnedAt: null,
      renewCount: 1,
      maxRenewals: 2,
      fineAmount: 0,
      status: 'borrowed',
    },
    {
      id: 'ln-hist-004',
      loanCode: 'PJM-2026-004',
      bookId: 'bk-002',
      bookTitle: 'Jejak Kartografi & Sejarah Maritim Nusantara',
      bookAuthor: 'Prof. Ratna Sari Dewi',
      shelfCode: 'R-03-B',
      memberId: 'archive-member-01',
      memberCode: 'AGT-0001',
      memberName: 'Arsip Anggota #0001',
      borrowedAt: t2,
      dueAt: addDaysIso(t2, 7),
      returnedAt: null,
      renewCount: 0,
      maxRenewals: 2,
      fineAmount: 0,
      status: 'borrowed',
    },
    {
      id: 'ln-hist-005',
      loanCode: 'PJM-2026-005',
      bookId: 'bk-006',
      bookTitle: 'Rekayasa Antarmuka & Tipografi Informasi',
      bookAuthor: 'Siti Rahmawati, M.Ds.',
      shelfCode: 'R-01-C',
      memberId: 'archive-member-02',
      memberCode: 'AGT-0002',
      memberName: 'Arsip Anggota #0002',
      borrowedAt: t1,
      dueAt: addDaysIso(t1, 7),
      returnedAt: null,
      renewCount: 0,
      maxRenewals: 2,
      fineAmount: 0,
      status: 'borrowed',
    },
    {
      id: 'ln-hist-006',
      loanCode: 'PJM-2026-006',
      bookId: 'bk-003',
      bookTitle: 'Ekologi Hutan Tropis & Konservasi Hayati',
      bookAuthor: 'Dr. Bagas Prakoso',
      shelfCode: 'R-02-C',
      memberId: 'archive-member-03',
      memberCode: 'AGT-0003',
      memberName: 'Arsip Anggota #0003',
      borrowedAt: t0,
      dueAt: addDaysIso(t0, 7),
      returnedAt: addDaysIso(t0, 4),
      renewCount: 0,
      maxRenewals: 2,
      fineAmount: 0,
      status: 'returned',
    },
  ];

  const activities: ActivityLog[] = [
    {
      id: 'act-001',
      type: 'borrow',
      actorId: 'archive-member-03',
      actorName: 'Arsip Anggota #0003',
      actorRole: 'member',
      targetId: 'bk-004',
      targetTitle: 'Senja di Gerbang Kota Tua: Antologi Sastra',
      summary: 'Peminjaman buku Senja di Gerbang Kota Tua: Antologi Sastra (PJM-2026-003)',
      timestamp: t2,
    },
    {
      id: 'act-002',
      type: 'borrow',
      actorId: 'archive-member-01',
      actorName: 'Arsip Anggota #0001',
      actorRole: 'member',
      targetId: 'bk-002',
      targetTitle: 'Jejak Kartografi & Sejarah Maritim Nusantara',
      summary: 'Peminjaman buku Jejak Kartografi & Sejarah Maritim Nusantara (PJM-2026-004)',
      timestamp: t2,
    },
    {
      id: 'act-003',
      type: 'return',
      actorId: 'archive-member-03',
      actorName: 'Arsip Anggota #0003',
      actorRole: 'member',
      targetId: 'bk-003',
      targetTitle: 'Ekologi Hutan Tropis & Konservasi Hayati',
      summary: 'Pengembalian tepat waktu Ekologi Hutan Tropis & Konservasi Hayati (PJM-2026-006)',
      timestamp: addDaysIso(t0, 4),
    },
  ];

  return {
    books,
    users: [],
    loans,
    reservations: [],
    activities,
    reports: [],
    reportSchedule: {
      enabled: true,
      frequency: 'daily',
      lastGeneratedAt: null,
      nextScheduledAt: addDaysIso(nowIso(), 1),
    },
  };
}

class LibraryStore {
  private data: DatabaseSchema = buildSeedData();
  private writeChain: Promise<void> = Promise.resolve();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const raw = await fs.readFile(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
      if (parsed && Array.isArray(parsed.books)) {
        this.data = {
          books: parsed.books ?? [],
          users: parsed.users ?? [],
          loans: parsed.loans ?? [],
          reservations: parsed.reservations ?? [],
          activities: parsed.activities ?? [],
          reports: parsed.reports ?? [],
          reportSchedule: parsed.reportSchedule ?? {
            enabled: true,
            frequency: 'daily',
            lastGeneratedAt: null,
            nextScheduledAt: addDaysIso(nowIso(), 1),
          },
        };
      }
    } catch {
      await this.persist();
    }
    this.refreshOverdueStatuses();
    this.initialized = true;
  }

  private async persist(): Promise<void> {
    const snapshot = JSON.stringify(this.data, null, 2);
    this.writeChain = this.writeChain.then(async () => {
      const tmpFile = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
      await fs.writeFile(tmpFile, snapshot, 'utf8');
      await fs.rename(tmpFile, DB_FILE);
    });
    await this.writeChain;
  }

  refreshOverdueStatuses(): boolean {
    const now = Date.now();
    let changed = false;
    for (const loan of this.data.loans) {
      if (loan.status === 'returned') continue;
      const dueMs = new Date(loan.dueAt).getTime();
      if (now > dueMs) {
        const daysLate = Math.max(1, Math.ceil((now - dueMs) / (1000 * 60 * 60 * 24)));
        const expectedFine = daysLate * FINE_PER_DAY_RP;
        if (loan.status !== 'overdue' || loan.fineAmount !== expectedFine) {
          loan.status = 'overdue';
          loan.fineAmount = expectedFine;
          changed = true;
        }
      }
    }
    return changed;
  }

  getBooks(): Book[] {
    return [...this.data.books].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getBookById(id: string): Book | undefined {
    return this.data.books.find((b) => b.id === id);
  }

  getUserById(id: string): StoredUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): StoredUser | undefined {
    const normalized = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email.toLowerCase() === normalized);
  }

  hasAdminUser(): boolean {
    return this.data.users.some((u) => u.role === 'admin');
  }

  async createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    passwordSalt: string;
    role: 'admin' | 'member';
  }): Promise<StoredUser> {
    const count = this.data.users.length + 1;
    const prefix = input.role === 'admin' ? 'ADM' : 'AGT';
    const user: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      memberCode: `${prefix}-${String(count).padStart(4, '0')}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      status: 'active',
      joinedAt: nowIso(),
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
    };
    this.data.users.push(user);
    await this.persist();
    return user;
  }

  getMembersDirectory(): MemberDirectoryItem[] {
    this.refreshOverdueStatuses();
    return this.data.users
      .filter((u) => u.role === 'member')
      .map((u) => {
        const memberLoans = this.data.loans.filter((l) => l.memberId === u.id);
        return {
          id: u.id,
          memberCode: u.memberCode,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          joinedAt: u.joinedAt,
          activeLoansCount: memberLoans.filter((l) => l.status !== 'returned').length,
          overdueLoansCount: memberLoans.filter((l) => l.status === 'overdue').length,
          totalBorrowsCount: memberLoans.length,
          totalFinesRp: memberLoans.reduce((sum, l) => sum + l.fineAmount, 0),
        };
      })
      .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  }

  async updateMemberStatus(
    memberId: string,
    status: 'active' | 'suspended',
    actor: PublicUser
  ): Promise<{ member: StoredUser; activity: ActivityLog } | null> {
    const user = this.data.users.find((u) => u.id === memberId && u.role === 'member');
    if (!user) return null;
    user.status = status;
    const activity = this.pushActivity({
      type: 'member_status',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      targetId: user.id,
      targetTitle: user.name,
      summary: `Status anggota ${user.name} (${user.memberCode}) diubah menjadi ${
        status === 'active' ? 'Aktif' : 'Ditangguhkan'
      }`,
    });
    await this.persist();
    return { member: user, activity };
  }

  async addBook(
    input: Omit<Book, 'id' | 'availableCopies' | 'borrowCount' | 'createdAt' | 'updatedAt'>,
    actor: PublicUser
  ): Promise<{ book: Book; activity: ActivityLog }> {
    const now = nowIso();
    const book: Book = {
      ...input,
      id: `bk-${crypto.randomUUID().slice(0, 8)}`,
      availableCopies: input.totalCopies,
      borrowCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.data.books.unshift(book);
    const activity = this.pushActivity({
      type: 'book_add',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      targetId: book.id,
      targetTitle: book.title,
      summary: `Koleksi baru ditambahkan: ${book.title} (${book.totalCopies} eksemplar)`,
    });
    await this.persist();
    return { book, activity };
  }

  async updateBook(
    bookId: string,
    patch: Partial<
      Pick<
        Book,
        | 'title'
        | 'author'
        | 'isbn'
        | 'category'
        | 'publisher'
        | 'year'
        | 'pages'
        | 'shelfCode'
        | 'ddcCode'
        | 'coverUrl'
        | 'synopsis'
        | 'excerptTitle'
        | 'excerptContent'
        | 'totalCopies'
      >
    >,
    actor: PublicUser
  ): Promise<{ book: Book; activity: ActivityLog } | { error: string }> {
    const book = this.data.books.find((b) => b.id === bookId);
    if (!book) return { error: 'Buku tidak ditemukan.' };

    const activeLoansCount = this.data.loans.filter(
      (l) => l.bookId === book.id && l.status !== 'returned'
    ).length;

    if (typeof patch.totalCopies === 'number') {
      if (patch.totalCopies < activeLoansCount) {
        return {
          error: `Total eksemplar tidak boleh kurang dari jumlah yang sedang dipinjam (${activeLoansCount}).`,
        };
      }
      book.totalCopies = patch.totalCopies;
      book.availableCopies = patch.totalCopies - activeLoansCount;
    }

    if (patch.title !== undefined) book.title = patch.title;
    if (patch.author !== undefined) book.author = patch.author;
    if (patch.isbn !== undefined) book.isbn = patch.isbn;
    if (patch.category !== undefined) book.category = patch.category;
    if (patch.publisher !== undefined) book.publisher = patch.publisher;
    if (patch.year !== undefined) book.year = patch.year;
    if (patch.pages !== undefined) book.pages = patch.pages;
    if (patch.shelfCode !== undefined) book.shelfCode = patch.shelfCode;
    if (patch.ddcCode !== undefined) book.ddcCode = patch.ddcCode;
    if (patch.coverUrl !== undefined) book.coverUrl = patch.coverUrl;
    if (patch.synopsis !== undefined) book.synopsis = patch.synopsis;
    if (patch.excerptTitle !== undefined) book.excerptTitle = patch.excerptTitle;
    if (patch.excerptContent !== undefined) book.excerptContent = patch.excerptContent;
    book.updatedAt = nowIso();

    const activity = this.pushActivity({
      type: 'book_update',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      targetId: book.id,
      targetTitle: book.title,
      summary: `Metadata koleksi diperbarui: ${book.title}`,
    });

    await this.persist();
    return { book, activity };
  }

  async deleteBook(
    bookId: string,
    actor: PublicUser
  ): Promise<{ deletedId: string; activity: ActivityLog } | { error: string }> {
    const idx = this.data.books.findIndex((b) => b.id === bookId);
    if (idx === -1) return { error: 'Buku tidak ditemukan.' };
    const activeLoansCount = this.data.loans.filter(
      (l) => l.bookId === bookId && l.status !== 'returned'
    ).length;
    if (activeLoansCount > 0) {
      return {
        error: `Tidak dapat menghapus buku karena masih ada ${activeLoansCount} peminjaman aktif.`,
      };
    }

    const [removed] = this.data.books.splice(idx, 1);
    // Cancel any remaining waiting reservations for this book
    for (const res of this.data.reservations) {
      if (res.bookId === bookId && (res.status === 'waiting' || res.status === 'ready')) {
        res.status = 'cancelled';
      }
    }

    const activity = this.pushActivity({
      type: 'book_delete',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      targetId: removed.id,
      targetTitle: removed.title,
      summary: `Koleksi dihapus dari katalog: ${removed.title}`,
    });

    await this.persist();
    return { deletedId: removed.id, activity };
  }

  getLoans(memberId?: string): Loan[] {
    this.refreshOverdueStatuses();
    const list = memberId
      ? this.data.loans.filter((l) => l.memberId === memberId)
      : this.data.loans;
    return [...list].sort((a, b) => b.borrowedAt.localeCompare(a.borrowedAt));
  }

  async borrowBook(
    bookId: string,
    borrower: PublicUser,
    days = DEFAULT_LOAN_DAYS
  ): Promise<{ loan: Loan; book: Book; activity: ActivityLog } | { error: string }> {
    this.refreshOverdueStatuses();
    const book = this.data.books.find((b) => b.id === bookId);
    if (!book) return { error: 'Buku tidak ditemukan.' };
    if (book.availableCopies <= 0) {
      return { error: 'Stok buku sedang habis. Silakan gunakan fitur reservasi antrean.' };
    }

    const alreadyBorrowed = this.data.loans.some(
      (l) => l.bookId === bookId && l.memberId === borrower.id && l.status !== 'returned'
    );
    if (alreadyBorrowed) {
      return { error: 'Anda sedang meminjam judul buku ini.' };
    }

    const activeCount = this.data.loans.filter(
      (l) => l.memberId === borrower.id && l.status !== 'returned'
    ).length;
    if (activeCount >= 5) {
      return { error: 'Batas maksimal 5 peminjaman aktif per anggota telah tercapai.' };
    }

    const hasOverdue = this.data.loans.some(
      (l) => l.memberId === borrower.id && l.status === 'overdue'
    );
    if (hasOverdue) {
      return { error: 'Harap kembalikan buku yang terlambat sebelum meminjam koleksi baru.' };
    }

    const now = nowIso();
    const loanNumber = String(this.data.loans.length + 1).padStart(3, '0');
    const loan: Loan = {
      id: `ln-${crypto.randomUUID().slice(0, 8)}`,
      loanCode: `PJM-2026-${loanNumber}`,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      shelfCode: book.shelfCode,
      memberId: borrower.id,
      memberCode: borrower.memberCode,
      memberName: borrower.name,
      borrowedAt: now,
      dueAt: addDaysIso(now, days),
      returnedAt: null,
      renewCount: 0,
      maxRenewals: 2,
      fineAmount: 0,
      status: 'borrowed',
    };

    book.availableCopies -= 1;
    book.borrowCount += 1;
    book.updatedAt = now;
    this.data.loans.unshift(loan);

    // Fulfill waiting/ready reservation by same user if any
    const userRes = this.data.reservations.find(
      (r) =>
        r.bookId === book.id &&
        r.memberId === borrower.id &&
        (r.status === 'waiting' || r.status === 'ready')
    );
    if (userRes) {
      userRes.status = 'fulfilled';
    }

    const activity = this.pushActivity({
      type: 'borrow',
      actorId: borrower.id,
      actorName: borrower.name,
      actorRole: borrower.role,
      targetId: book.id,
      targetTitle: book.title,
      summary: `${borrower.name} meminjam "${book.title}" (${loan.loanCode})`,
    });

    await this.persist();
    return { loan, book, activity };
  }

  async returnLoan(
    loanId: string,
    actor: PublicUser
  ): Promise<
    | { loan: Loan; book: Book; promotedReservation: Reservation | null; activity: ActivityLog }
    | { error: string; status?: number }
  > {
    this.refreshOverdueStatuses();
    const loan = this.data.loans.find((l) => l.id === loanId);
    if (!loan) return { error: 'Transaksi peminjaman tidak ditemukan.', status: 404 };

    if (actor.role !== 'admin' && loan.memberId !== actor.id) {
      return { error: 'Anda tidak memiliki izin mengembalikan transaksi ini.', status: 403 };
    }
    if (loan.status === 'returned') {
      return { error: 'Buku pada transaksi ini sudah dikembalikan.', status: 400 };
    }

    const book = this.data.books.find((b) => b.id === loan.bookId);
    if (!book) return { error: 'Data buku terkait tidak ditemukan.', status: 404 };

    const now = nowIso();
    loan.status = 'returned';
    loan.returnedAt = now;
    book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
    book.updatedAt = now;

    // Promote first waiting reservation to ready
    const waitingRes = this.data.reservations
      .filter((r) => r.bookId === book.id && r.status === 'waiting')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (waitingRes) {
      waitingRes.status = 'ready';
    }

    const fineLabel = loan.fineAmount > 0 ? ` · Denda Rp ${loan.fineAmount.toLocaleString('id-ID')}` : '';
    const activity = this.pushActivity({
      type: 'return',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      targetId: book.id,
      targetTitle: book.title,
      summary: `Pengembalian "${book.title}" (${loan.loanCode})${fineLabel}`,
    });

    await this.persist();
    return { loan, book, promotedReservation: waitingRes ?? null, activity };
  }

  async renewLoan(
    loanId: string,
    actor: PublicUser
  ): Promise<{ loan: Loan; activity: ActivityLog } | { error: string; status?: number }> {
    this.refreshOverdueStatuses();
    const loan = this.data.loans.find((l) => l.id === loanId);
    if (!loan) return { error: 'Transaksi peminjaman tidak ditemukan.', status: 404 };
    if (actor.role !== 'admin' && loan.memberId !== actor.id) {
      return { error: 'Anda tidak memiliki izin memperpanjang peminjaman ini.', status: 403 };
    }
    if (loan.status === 'returned') {
      return { error: 'Buku sudah dikembalikan dan tidak dapat diperpanjang.', status: 400 };
    }
    if (loan.status === 'overdue' && actor.role !== 'admin') {
      return { error: 'Peminjaman yang sudah terlambat hanya dapat diproses oleh admin.', status: 400 };
    }
    if (loan.renewCount >= loan.maxRenewals) {
      return { error: `Batas maksimal perpanjangan (${loan.maxRenewals}x) telah tercapai.`, status: 400 };
    }

    const hasWaitingQueue = this.data.reservations.some(
      (r) => r.bookId === loan.bookId && r.status === 'waiting'
    );
    if (hasWaitingQueue) {
      return { error: 'Tidak dapat diperpanjang karena ada anggota lain dalam antrean reservasi.', status: 400 };
    }

    loan.dueAt = addDaysIso(loan.dueAt, DEFAULT_LOAN_DAYS);
    loan.renewCount += 1;
    if (new Date(loan.dueAt).getTime() > Date.now()) {
      loan.status = 'borrowed';
    }

    const activity = this.pushActivity({
      type: 'renew',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      targetId: loan.bookId,
      targetTitle: loan.bookTitle,
      summary: `Perpanjangan +7 hari untuk "${loan.bookTitle}" (${loan.loanCode})`,
    });

    await this.persist();
    return { loan, activity };
  }

  getReservations(memberId?: string): Reservation[] {
    const list = memberId
      ? this.data.reservations.filter((r) => r.memberId === memberId)
      : this.data.reservations;
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createReservation(
    bookId: string,
    member: PublicUser
  ): Promise<{ reservation: Reservation; activity: ActivityLog } | { error: string }> {
    const book = this.data.books.find((b) => b.id === bookId);
    if (!book) return { error: 'Buku tidak ditemukan.' };
    if (book.availableCopies > 0) {
      return { error: 'Buku masih tersedia di rak. Anda dapat langsung meminjamnya.' };
    }

    const existingRes = this.data.reservations.find(
      (r) =>
        r.bookId === bookId &&
        r.memberId === member.id &&
        (r.status === 'waiting' || r.status === 'ready')
    );
    if (existingRes) {
      return { error: 'Anda sudah masuk dalam daftar antrean reservasi buku ini.' };
    }

    const existingLoan = this.data.loans.find(
      (l) => l.bookId === bookId && l.memberId === member.id && l.status !== 'returned'
    );
    if (existingLoan) {
      return { error: 'Anda sedang meminjam buku ini.' };
    }

    const resNumber = String(this.data.reservations.length + 1).padStart(3, '0');
    const reservation: Reservation = {
      id: `res-${crypto.randomUUID().slice(0, 8)}`,
      reservationCode: `RSV-2026-${resNumber}`,
      bookId: book.id,
      bookTitle: book.title,
      memberId: member.id,
      memberCode: member.memberCode,
      memberName: member.name,
      createdAt: nowIso(),
      status: 'waiting',
    };

    this.data.reservations.unshift(reservation);

    const activity = this.pushActivity({
      type: 'reserve',
      actorId: member.id,
      actorName: member.name,
      actorRole: member.role,
      targetId: book.id,
      targetTitle: book.title,
      summary: `${member.name} masuk antrean reservasi "${book.title}" (${reservation.reservationCode})`,
    });

    await this.persist();
    return { reservation, activity };
  }

  async cancelReservation(
    reservationId: string,
    actor: PublicUser
  ): Promise<{ reservation: Reservation; activity: ActivityLog } | { error: string; status?: number }> {
    const res = this.data.reservations.find((r) => r.id === reservationId);
    if (!res) return { error: 'Reservasi tidak ditemukan.', status: 404 };
    if (actor.role !== 'admin' && res.memberId !== actor.id) {
      return { error: 'Anda tidak memiliki izin membatalkan reservasi ini.', status: 403 };
    }
    if (res.status === 'cancelled' || res.status === 'fulfilled') {
      return { error: 'Reservasi ini sudah tidak aktif.', status: 400 };
    }

    res.status = 'cancelled';
    const activity = this.pushActivity({
      type: 'reserve_cancel',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      targetId: res.bookId,
      targetTitle: res.bookTitle,
      summary: `Reservasi dibatalkan untuk "${res.bookTitle}" (${res.reservationCode})`,
    });

    await this.persist();
    return { reservation: res, activity };
  }

  getActivities(viewer?: PublicUser): ActivityLog[] {
    const sorted = [...this.data.activities].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (viewer?.role === 'admin') {
      return sorted.slice(0, 80);
    }
    // Redact other members' personal names for non-admin viewers
    return sorted.slice(0, 50).map((item) => {
      if (viewer && item.actorId === viewer.id) {
        return item;
      }
      if (item.actorRole === 'member') {
        return {
          ...item,
          actorName: 'Anggota KAJILIB',
          summary: item.summary.replace(item.actorName, 'Anggota KAJILIB'),
        };
      }
      return item;
    });
  }

  private pushActivity(input: {
    type: ActivityType;
    actorId: string;
    actorName: string;
    actorRole: 'admin' | 'member' | 'system';
    targetId: string;
    targetTitle: string;
    summary: string;
  }): ActivityLog {
    const entry: ActivityLog = {
      id: `act-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      timestamp: nowIso(),
    };
    this.data.activities.unshift(entry);
    if (this.data.activities.length > 250) {
      this.data.activities = this.data.activities.slice(0, 250);
    }
    return entry;
  }

  getStats(): LibraryStats {
    this.refreshOverdueStatuses();
    const totalTitles = this.data.books.length;
    const totalCopies = this.data.books.reduce((sum, b) => sum + b.totalCopies, 0);
    const availableCopies = this.data.books.reduce((sum, b) => sum + b.availableCopies, 0);
    const activeLoans = this.data.loans.filter((l) => l.status !== 'returned').length;
    const overdueLoans = this.data.loans.filter((l) => l.status === 'overdue').length;
    const waitingReservations = this.data.reservations.filter(
      (r) => r.status === 'waiting' || r.status === 'ready'
    ).length;
    const registeredMembers = this.data.users.filter((u) => u.role === 'member').length;
    const totalFinesRp = this.data.loans.reduce((sum, l) => sum + l.fineAmount, 0);
    const totalBorrowsAllTime = this.data.books.reduce((sum, b) => sum + b.borrowCount, 0);

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      activeLoans,
      overdueLoans,
      waitingReservations,
      registeredMembers,
      totalFinesRp,
      totalBorrowsAllTime,
    };
  }

  getReports(): AutoReport[] {
    return [...this.data.reports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  getReportById(id: string): AutoReport | undefined {
    return this.data.reports.find((r) => r.id === id);
  }

  getReportSchedule(): ReportScheduleConfig {
    return { ...this.data.reportSchedule };
  }

  async updateReportSchedule(
    patch: Partial<Pick<ReportScheduleConfig, 'enabled' | 'frequency'>>
  ): Promise<ReportScheduleConfig> {
    if (patch.enabled !== undefined) this.data.reportSchedule.enabled = patch.enabled;
    if (patch.frequency !== undefined) this.data.reportSchedule.frequency = patch.frequency;
    const days =
      this.data.reportSchedule.frequency === 'daily'
        ? 1
        : this.data.reportSchedule.frequency === 'weekly'
          ? 7
          : 30;
    this.data.reportSchedule.nextScheduledAt = this.data.reportSchedule.enabled
      ? addDaysIso(nowIso(), days)
      : null;
    await this.persist();
    return this.getReportSchedule();
  }

  async saveReport(report: AutoReport, actorName: string): Promise<{ report: AutoReport; activity: ActivityLog }> {
    this.data.reports.unshift(report);
    if (this.data.reports.length > 60) {
      this.data.reports = this.data.reports.slice(0, 60);
    }
    if (report.trigger === 'scheduled') {
      const days =
        this.data.reportSchedule.frequency === 'daily'
          ? 1
          : this.data.reportSchedule.frequency === 'weekly'
            ? 7
            : 30;
      this.data.reportSchedule.lastGeneratedAt = report.generatedAt;
      this.data.reportSchedule.nextScheduledAt = this.data.reportSchedule.enabled
        ? addDaysIso(report.generatedAt, days)
        : null;
    } else {
      this.data.reportSchedule.lastGeneratedAt = report.generatedAt;
    }

    const activity = this.pushActivity({
      type: 'report_generated',
      actorId: 'system',
      actorName,
      actorRole: 'system',
      targetId: report.id,
      targetTitle: report.title,
      summary: `Laporan ${report.trigger === 'scheduled' ? 'otomatis' : 'manual'} diterbitkan: ${report.reportCode}`,
    });

    await this.persist();
    return { report, activity };
  }

  getAllRawLoans(): Loan[] {
    return this.data.loans;
  }

  getAllRawReservations(): Reservation[] {
    return this.data.reservations;
  }
}

export const libraryStore = new LibraryStore();
