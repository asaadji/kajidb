import { useMemo, useState } from 'react';
import {
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { BookCover } from './BookCover';
import type { Book, LibraryStats, Loan, PublicUser, Reservation } from '../types';

interface CatalogViewProps {
  books: Book[];
  stats: LibraryStats | null;
  user: PublicUser | null;
  loans: Loan[];
  reservations: Reservation[];
  busyBookId: string | null;
  onSelectBook: (book: Book) => void;
  onBorrow: (bookId: string, days: number) => void;
  onReserve: (bookId: string) => void;
  onRequireAuth: () => void;
  onGoToDashboard: () => void;
}

export function CatalogView({
  books,
  stats,
  user,
  loans,
  reservations,
  busyBookId,
  onSelectBook,
  onBorrow,
  onReserve,
  onRequireAuth,
  onGoToDashboard,
}: CatalogViewProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'title'>('newest');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(books.map((b) => b.category)));
    return ['Semua', ...unique];
  }, [books]);

  const activeLoanBookIds = useMemo(() => {
    return new Set(loans.filter((l) => l.status !== 'returned').map((l) => l.bookId));
  }, [loans]);

  const activeReservationBookIds = useMemo(() => {
    return new Set(
      reservations
        .filter((r) => r.status === 'waiting' || r.status === 'ready')
        .map((r) => r.bookId)
    );
  }, [reservations]);

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = books.filter((book) => {
      if (selectedCategory !== 'Semua' && book.category !== selectedCategory) return false;
      if (availabilityFilter === 'available' && book.availableCopies <= 0) return false;
      if (!q) return true;
      return (
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.isbn.toLowerCase().includes(q) ||
        book.category.toLowerCase().includes(q)
      );
    });

    if (sortBy === 'popular') {
      return [...list].sort((a, b) => b.borrowCount - a.borrowCount);
    }
    if (sortBy === 'title') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title, 'id-ID'));
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [books, query, selectedCategory, availabilityFilter, sortBy]);

  return (
    <div className="space-y-10">
      {/* Hero Split Section */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="flex flex-col justify-between p-6 sm:p-10 lg:col-span-7">
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-wide text-teal-800">
                Perpustakaan Digital & Manajemen Sirkulasi
              </p>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                Akses koleksi pengetahuan dan pantau sirkulasi pustaka secara real-time.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-600">
                Temukan buku referensi akademik, literatur klasik, dan cuplikan digital di KAJILIB.
                Pinjam koleksi langsung dari katalog, kelola masa pinjam, dan pantau transaksi
                perpustakaan dalam satu sistem terpadu.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari judul buku, penulis, ISBN, atau subjek..."
                  aria-label="Cari katalog buku"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#katalog-koleksi"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap"
                >
                  Jelajahi Koleksi
                </a>
                <button
                  type="button"
                  onClick={onGoToDashboard}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {user ? 'Buka Dashboard Saya' : 'Masuk ke Akun Anggota'}
                  <ArrowUpRight className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            </div>
          </div>

          <div className="relative min-h-[240px] lg:col-span-5 bg-slate-900">
            <img
              src="/src/assets/images/hero_kajilib_interior_1795661239917.jpg"
              alt="Ruang baca arsitektural perpustakaan KAJILIB dengan rak kayu dan cahaya alami"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <p className="text-xs font-medium text-teal-200">Layanan Sirkulasi 24/7</p>
              <p className="mt-0.5 text-sm font-medium text-white">
                Peminjaman 7–14 hari dengan perpanjangan daring & antrean reservasi otomatis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column Live KPI Strip */}
      <section aria-label="Ringkasan statistik perpustakaan">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Judul Koleksi</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {stats ? stats.totalTitles : books.length}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {stats ? `${stats.totalCopies} total eksemplar` : 'Memuat stok...'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Eksemplar Tersedia</p>
            <p className="mt-2 font-display text-2xl font-bold text-emerald-700 tabular-nums">
              {stats ? stats.availableCopies : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Siap dipinjam hari ini</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Peminjaman Aktif</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {stats ? stats.activeLoans : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {stats && stats.overdueLoans > 0
                ? `${stats.overdueLoans} melewati jatuh tempo`
                : 'Semua dalam masa pinjam'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Akumulasi Sirkulasi</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {stats ? stats.totalBorrowsAllTime : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {stats ? `${stats.registeredMembers} anggota terdaftar` : 'Pembaruan real-time'}
            </p>
          </div>
        </div>
      </section>

      {/* Catalog Controls & Grid */}
      <section id="katalog-koleksi" className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Katalog Koleksi Buku
            </h2>
            <p className="mt-1 text-sm text-slate-600 tabular-nums">
              Menampilkan {filteredBooks.length} dari {books.length} judul terindeks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAvailabilityFilter('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  availabilityFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Stok
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter('available')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  availabilityFilter === 'available'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tersedia Saja
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular' | 'title')}
              aria-label="Urutkan katalog"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-teal-700 focus:outline-none"
            >
              <option value="newest">Urutkan: Terbaru</option>
              <option value="popular">Urutkan: Paling Sering Dipinjam</option>
              <option value="title">Urutkan: Judul A–Z</option>
            </select>
          </div>
        </div>

        {/* Category Segmented Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Book Cards Grid */}
        {filteredBooks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
              Koleksi tidak ditemukan
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Tidak ada buku yang sesuai dengan kata kunci atau filter kategori Anda.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedCategory('Semua');
                setAvailabilityFilter('all');
              }}
              className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              Atur Ulang Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredBooks.map((book) => {
              const isAvailable = book.availableCopies > 0;
              const isBorrowed = activeLoanBookIds.has(book.id);
              const isReserved = activeReservationBookIds.has(book.id);
              const isBusy = busyBookId === book.id;

              return (
                <article
                  key={book.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
                >
                  <button
                    type="button"
                    onClick={() => onSelectBook(book)}
                    className="aspect-[3/4] w-full overflow-hidden bg-slate-100 text-left cursor-pointer"
                  >
                    <BookCover
                      src={book.coverUrl}
                      title={book.title}
                      author={book.author}
                      category={book.category}
                      className="transition-transform duration-300 hover:scale-[1.02]"
                    />
                  </button>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div className="space-y-2">
                      {/* Zero-pill inline metadata */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                        <span className="truncate">{book.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums shrink-0">{book.year}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono shrink-0">{book.shelfCode}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectBook(book)}
                        className="text-left cursor-pointer"
                      >
                        <h3 className="font-display text-base font-bold leading-snug text-slate-900 line-clamp-2 hover:text-teal-800">
                          {book.title}
                        </h3>
                      </button>

                      <p className="text-xs font-medium text-slate-600 truncate">{book.author}</p>
                    </div>

                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                      {/* Availability status with explicit icon + text (never color alone) */}
                      <div className="flex items-center justify-between text-xs">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 tabular-nums">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            Tersedia {book.availableCopies}/{book.totalCopies}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            Dipinjam semua
                          </span>
                        )}
                        <span className="text-slate-500 tabular-nums">
                          {book.borrowCount}x dipinjam
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectBook(book)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Detail & Baca
                        </button>

                        {isBorrowed ? (
                          <button
                            type="button"
                            onClick={onGoToDashboard}
                            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Dipinjam
                          </button>
                        ) : isReserved ? (
                          <button
                            type="button"
                            onClick={onGoToDashboard}
                            className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Di Antrean
                          </button>
                        ) : isAvailable ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => (user ? onBorrow(book.id, 7) : onRequireAuth())}
                            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {isBusy ? 'Proses...' : 'Pinjam'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => (user ? onReserve(book.id) : onRequireAuth())}
                            className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {isBusy ? 'Proses...' : 'Reservasi'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
