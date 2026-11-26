import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Trash2,
  Users,
  BookMarked,
  Activity,
  X,
} from 'lucide-react';
import { AuthPanel } from './AuthPanel';
import { formatDateId, formatRp, formatTimeId } from '../lib/format';
import type {
  ActivityLog,
  Book,
  LibraryStats,
  Loan,
  MemberDirectoryItem,
  PublicUser,
} from '../types';

interface AdminDashboardViewProps {
  user: PublicUser | null;
  books: Book[];
  loans: Loan[];
  members: MemberDirectoryItem[];
  activities: ActivityLog[];
  stats: LibraryStats | null;
  wsConnected: boolean;
  onAuthSuccess: (user: PublicUser, token: string) => void;
  onCreateBook: (
    data: Omit<Book, 'id' | 'availableCopies' | 'borrowCount' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onUpdateBook: (id: string, data: Partial<Book>) => Promise<void>;
  onDeleteBook: (id: string) => Promise<void>;
  onReturnLoan: (loanId: string) => Promise<void>;
  onToggleMemberStatus: (memberId: string, nextStatus: 'active' | 'suspended') => Promise<void>;
}

const COVER_PRESETS = [
  {
    label: 'Sampul Teknologi & Sistem',
    url: '/src/assets/images/cover_algoritma_sistem_1795661240053.jpg',
  },
  {
    label: 'Sampul Sejarah & Maritim',
    url: '/src/assets/images/cover_sejarah_maritim_1795661240510.jpg',
  },
  {
    label: 'Sampul Ekologi & Sains',
    url: '/src/assets/images/cover_ekologi_nusantara_1795661240321.jpg',
  },
  {
    label: 'Sampul Sastra & Humaniora',
    url: '/src/assets/images/cover_sastra_kontemporer_1795661240212.jpg',
  },
];

const CATEGORIES = [
  'Teknologi & Rekayasa',
  'Sejarah & Budaya',
  'Ekologi & Sains',
  'Sastra & Humaniora',
  'Ekonomi & Kebijakan',
];

export function AdminDashboardView({
  user,
  books,
  loans,
  members,
  activities,
  stats,
  wsConnected,
  onAuthSuccess,
  onCreateBook,
  onUpdateBook,
  onDeleteBook,
  onReturnLoan,
  onToggleMemberStatus,
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'realtime' | 'collection' | 'members'>('realtime');
  const [loanFilter, setLoanFilter] = useState<'all' | 'borrowed' | 'overdue' | 'returned'>('all');
  const [bookSearch, setBookSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Book form fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState(2026);
  const [pages, setPages] = useState(280);
  const [shelfCode, setShelfCode] = useState('R-01-A');
  const [ddcCode, setDdcCode] = useState('005.1');
  const [totalCopies, setTotalCopies] = useState(3);
  const [coverUrl, setCoverUrl] = useState(COVER_PRESETS[0].url);
  const [synopsis, setSynopsis] = useState('');
  const [excerptTitle, setExcerptTitle] = useState('Bab 1: Ringkasan Koleksi');
  const [excerptContent, setExcerptContent] = useState('');

  const filteredLoans = useMemo(() => {
    if (loanFilter === 'all') return loans;
    return loans.filter((l) => l.status === loanFilter);
  }, [loans, loanFilter]);

  const filteredBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        b.shelfCode.toLowerCase().includes(q)
    );
  }, [books, bookSearch]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl py-6 space-y-4">
        {user && user.role !== 'admin' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Anda saat ini masuk sebagai anggota (<strong>{user.name}</strong>). Silakan masuk
            menggunakan akun Administrator untuk mengakses konsol pengelolaan KAJILIB.
          </div>
        )}
        <AuthPanel defaultMode="admin" onSuccess={onAuthSuccess} />
      </div>
    );
  }

  const openCreateModal = () => {
    setEditingBook(null);
    setTitle('');
    setAuthor('');
    setIsbn('');
    setCategory(CATEGORIES[0]);
    setPublisher('Pustaka Cendekia Nusantara');
    setYear(2026);
    setPages(280);
    setShelfCode('R-01-A');
    setDdcCode('005.1');
    setTotalCopies(3);
    setCoverUrl(COVER_PRESETS[0].url);
    setSynopsis('');
    setExcerptTitle('Bab 1: Ringkasan Koleksi');
    setExcerptContent('');
    setFormError(null);
    setEditorOpen(true);
  };

  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setIsbn(book.isbn);
    setCategory(book.category);
    setPublisher(book.publisher);
    setYear(book.year);
    setPages(book.pages);
    setShelfCode(book.shelfCode);
    setDdcCode(book.ddcCode);
    setTotalCopies(book.totalCopies);
    setCoverUrl(book.coverUrl || COVER_PRESETS[0].url);
    setSynopsis(book.synopsis);
    setExcerptTitle(book.excerptTitle);
    setExcerptContent(book.excerptContent);
    setFormError(null);
    setEditorOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormBusy(true);
    try {
      const payload = {
        title,
        author,
        isbn,
        category,
        publisher,
        year: Number(year),
        pages: Number(pages),
        shelfCode,
        ddcCode,
        totalCopies: Number(totalCopies),
        coverUrl,
        synopsis,
        excerptTitle,
        excerptContent,
      };
      if (editingBook) {
        await onUpdateBook(editingBook.id, payload);
      } else {
        await onCreateBook(payload);
      }
      setEditorOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan koleksi.');
    } finally {
      setFormBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Konsol Administrator · {user.name} (<span className="font-mono">{user.memberCode}</span>)
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-900">
            Operasional & Manajemen KAJILIB
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              wsConnected ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            {wsConnected ? 'Stream Real-Time Aktif' : 'Menghubungkan...'}
          </span>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Tambah Koleksi
          </button>
        </div>
      </div>

      {/* Admin Live KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Inventaris Koleksi</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {stats?.totalTitles ?? books.length} Judul
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {stats?.availableCopies ?? 0} dari {stats?.totalCopies ?? 0} eksemplar tersedia
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Sirkulasi Berjalan</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {stats?.activeLoans ?? 0} Aktif
          </p>
          <p className="mt-1 text-xs text-amber-700 tabular-nums">
            {stats?.waitingReservations ?? 0} antrean reservasi
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Keterlambatan & Denda</p>
          <p className="mt-2 font-display text-2xl font-bold text-red-700 tabular-nums">
            {stats?.overdueLoans ?? 0} Terlambat
          </p>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            Estimasi denda {formatRp(stats?.totalFinesRp ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Anggota Terdaftar</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {members.length} Akun
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {members.filter((m) => m.status === 'active').length} status aktif
          </p>
        </div>
      </div>

      {/* Workspace Sub-Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('realtime')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'realtime'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Pantauan Real-Time & Sirkulasi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('collection')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'collection'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookMarked className="h-3.5 w-3.5" />
          Manajemen Koleksi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'members'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Direktori Anggota
        </button>
      </div>

      {/* TAB 1: Real-time Transactions & Loan Management */}
      {activeTab === 'realtime' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Daftar Transaksi Peminjaman
              </h2>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(['all', 'borrowed', 'overdue', 'returned'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setLoanFilter(st)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      loanFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'all'
                      ? 'Semua'
                      : st === 'borrowed'
                        ? 'Dipinjam'
                        : st === 'overdue'
                          ? 'Terlambat'
                          : 'Selesai'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Kode</th>
                    <th className="px-4 py-3 font-semibold">Judul & Peminjam</th>
                    <th className="px-4 py-3 font-semibold">Jatuh Tempo</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-slate-700 whitespace-nowrap">
                        {loan.loanCode}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{loan.bookTitle}</p>
                        <p className="text-slate-500">
                          {loan.memberName} · <span className="font-mono">{loan.memberCode}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap text-slate-700">
                        {formatDateId(loan.dueAt)}
                        {loan.fineAmount > 0 && (
                          <span className="block font-mono text-red-700">
                            {formatRp(loan.fineAmount)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {loan.status === 'returned' ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Dikembalikan
                          </span>
                        ) : loan.status === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Terlambat
                          </span>
                        ) : (
                          <span className="font-medium text-teal-800">Aktif Dipinjam</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {loan.status !== 'returned' ? (
                          <button
                            type="button"
                            onClick={() => onReturnLoan(loan.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Proses Kembali
                          </button>
                        ) : (
                          <span className="text-slate-400 tabular-nums">
                            {loan.returnedAt ? formatDateId(loan.returnedAt) : 'Selesai'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live WebSocket Activity Feed */}
          <div className="rounded-xl border border-slate-200 bg-white lg:col-span-4">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-display text-base font-bold text-slate-900">
                Log Aktivitas Real-Time
              </h2>
              <span className="font-mono text-xs text-slate-500">WebSocket</span>
            </div>
            <div className="max-h-[540px] divide-y divide-slate-100 overflow-y-auto">
              {activities.map((act) => (
                <div key={act.id} className="px-5 py-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-900">{act.actorName}</span>
                    <time className="font-mono text-slate-400 tabular-nums shrink-0">
                      {formatTimeId(act.timestamp)}
                    </time>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{act.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Collection Management */}
      {activeTab === 'collection' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Inventaris Koleksi Buku ({filteredBooks.length})
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Cari judul, ISBN, rak..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Judul & Penulis</th>
                  <th className="px-4 py-3 font-semibold">ISBN / DDC</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Rak</th>
                  <th className="px-4 py-3 text-right font-semibold">Stok</th>
                  <th className="px-4 py-3 text-right font-semibold">Sirkulasi</th>
                  <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{book.title}</p>
                      <p className="text-slate-500">
                        {book.author} · <span className="tabular-nums">{book.year}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {book.isbn}
                      <span className="block text-slate-400">DDC {book.ddcCode}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{book.category}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      {book.shelfCode}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={
                          book.availableCopies > 0
                            ? 'font-semibold text-emerald-700'
                            : 'font-semibold text-amber-700'
                        }
                      >
                        {book.availableCopies}/{book.totalCopies}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {book.borrowCount}x
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(book)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </button>
                        {confirmDeleteId === book.id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteBook(book.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
                          >
                            Konfirmasi Hapus
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(book.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Members Directory */}
      {activeTab === 'members' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Direktori Anggota Perpustakaan ({members.length})
            </h2>
          </div>

          {members.length === 0 ? (
            <div className="px-6 py-10 text-center text-xs text-slate-500">
              Belum ada anggota yang mendaftar melalui portal registrasi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Kode</th>
                    <th className="px-4 py-3 font-semibold">Nama & Email</th>
                    <th className="px-4 py-3 font-semibold">Bergabung</th>
                    <th className="px-4 py-3 text-right font-semibold">Pinjam Aktif</th>
                    <th className="px-4 py-3 text-right font-semibold">Denda</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-slate-700 whitespace-nowrap">
                        {m.memberCode}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{m.name}</p>
                        <p className="text-slate-500">{m.email}</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600 whitespace-nowrap">
                        {formatDateId(m.joinedAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {m.activeLoansCount} ({m.totalBorrowsCount} total)
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                        {formatRp(m.totalFinesRp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {m.status === 'active' ? (
                          <span className="font-medium text-emerald-700">Aktif</span>
                        ) : (
                          <span className="font-semibold text-red-700">Ditangguhkan</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            onToggleMemberStatus(
                              m.id,
                              m.status === 'active' ? 'suspended' : 'active'
                            )
                          }
                          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
                        >
                          {m.status === 'active' ? 'Tangguhkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Book Add/Edit Modal */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {editingBook ? 'Perbarui Koleksi Buku' : 'Tambah Koleksi Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Buku
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Penulis
                  </label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ISBN
                  </label>
                  <input
                    type="text"
                    required
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="978-602-..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Penerbit
                  </label>
                  <input
                    type="text"
                    required
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tahun
                    </label>
                    <input
                      type="number"
                      required
                      min={1800}
                      max={2100}
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Halaman
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={5000}
                      value={pages}
                      onChange={(e) => setPages(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Total Stok
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={500}
                      value={totalCopies}
                      onChange={(e) => setTotalCopies(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Rak
                  </label>
                  <input
                    type="text"
                    required
                    value={shelfCode}
                    onChange={(e) => setShelfCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Klasifikasi DDC
                  </label>
                  <input
                    type="text"
                    required
                    value={ddcCode}
                    onChange={(e) => setDdcCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Sampul Koleksi
                  </label>
                  <select
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  >
                    {COVER_PRESETS.map((p) => (
                      <option key={p.url} value={p.url}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sinopsis
                  </label>
                  <textarea
                    rows={3}
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Cuplikan Digital
                  </label>
                  <input
                    type="text"
                    value={excerptTitle}
                    onChange={(e) => setExcerptTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Isi Cuplikan Digital
                  </label>
                  <textarea
                    rows={4}
                    value={excerptContent}
                    onChange={(e) => setExcerptContent(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formBusy}
                  className="rounded-lg bg-teal-700 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
                >
                  {formBusy ? 'Menyimpan...' : editingBook ? 'Simpan Perubahan' : 'Terbitkan Koleksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
