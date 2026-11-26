import { useState } from 'react';
import { X, BookOpen, Calendar, Layers, MapPin, Minus, Plus } from 'lucide-react';
import { BookCover } from './BookCover';
import type { Book, PublicUser } from '../types';

interface BookReaderModalProps {
  book: Book;
  user: PublicUser | null;
  isBorrowedByUser: boolean;
  isReservedByUser: boolean;
  busy: boolean;
  onClose: () => void;
  onBorrow: (bookId: string, days: number) => void;
  onReserve: (bookId: string) => void;
  onRequireAuth: () => void;
}

export function BookReaderModal({
  book,
  user,
  isBorrowedByUser,
  isReservedByUser,
  busy,
  onClose,
  onBorrow,
  onReserve,
  onRequireAuth,
}: BookReaderModalProps) {
  const [activeTab, setActiveTab] = useState<'detail' | 'reader'>('detail');
  const [loanDays, setLoanDays] = useState<number>(7);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  const isAvailable = book.availableCopies > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-teal-700 shrink-0" />
            <span className="truncate text-xs font-medium text-slate-500">
              {book.category} · DDC <span className="font-mono">{book.ddcCode}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela buku"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className={`relative py-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'detail'
                ? 'text-teal-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Informasi & Peminjaman
            {activeTab === 'detail' && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-700" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reader')}
            className={`relative py-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'reader'
                ? 'text-teal-800 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Baca Cuplikan Digital
            {activeTab === 'reader' && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-700" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'detail' ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[190px_1fr]">
              <div className="aspect-[3/4] w-full max-w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <BookCover
                  src={book.coverUrl}
                  title={book.title}
                  author={book.author}
                  category={book.category}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h2
                    id="reader-modal-title"
                    className="font-display text-2xl font-bold leading-tight text-slate-900"
                  >
                    {book.title}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-700">{book.author}</p>
                </div>

                <p className="text-sm leading-relaxed text-slate-600">{book.synopsis}</p>

                {/* Metadata Grid */}
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-slate-200 py-4 text-xs">
                  <div>
                    <dt className="text-slate-500">ISBN</dt>
                    <dd className="mt-0.5 font-mono font-medium text-slate-900">{book.isbn}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Penerbit & Tahun</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">
                      {book.publisher} · <span className="tabular-nums">{book.year}</span>
                    </dd>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <dt className="text-slate-500">Lokasi Rak</dt>
                      <dd className="mt-0.5 font-mono font-medium text-slate-900">
                        {book.shelfCode}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <dt className="text-slate-500">Ketersediaan & Halaman</dt>
                      <dd className="mt-0.5 font-medium text-slate-900 tabular-nums">
                        {book.availableCopies}/{book.totalCopies} eksemplar · {book.pages} hlm
                      </dd>
                    </div>
                  </div>
                </dl>

                {/* Borrow Controls */}
                <div className="space-y-3 pt-1">
                  {isBorrowedByUser ? (
                    <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                      Anda sedang meminjam koleksi ini. Kelola pengembalian atau perpanjangan di
                      Dashboard Anggota.
                    </div>
                  ) : isReservedByUser ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Anda sudah berada dalam antrean reservasi buku ini.
                    </div>
                  ) : isAvailable ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>Durasi pinjam:</span>
                        <select
                          value={loanDays}
                          onChange={(e) => setLoanDays(Number(e.target.value))}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
                        >
                          <option value={3}>3 Hari</option>
                          <option value={7}>7 Hari (Standar)</option>
                          <option value={14}>14 Hari</option>
                        </select>
                      </div>

                      {user ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onBorrow(book.id, loanDays)}
                          className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {busy ? 'Memproses...' : 'Pinjam Buku Ini'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onRequireAuth}
                          className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Masuk untuk Meminjam
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="text-sm font-medium text-amber-700">
                        Seluruh eksemplar sedang dipinjam. Masuk antrean reservasi untuk diprioritaskan saat kembali.
                      </p>
                      {user ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onReserve(book.id)}
                          className="rounded-lg border border-amber-600 bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {busy ? 'Memproses...' : 'Reservasi Antrean'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onRequireAuth}
                          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Masuk untuk Reservasi
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-medium text-teal-700">Cuplikan Digital Resmi</p>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    {book.excerptTitle}
                  </h3>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1">
                  <button
                    type="button"
                    onClick={() => setFontSize('sm')}
                    aria-label="Perkecil teks"
                    className={`rounded-md p-1.5 cursor-pointer ${
                      fontSize === 'sm' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2 text-xs font-medium text-slate-600">Ukuran Teks</span>
                  <button
                    type="button"
                    onClick={() => setFontSize('lg')}
                    aria-label="Perbesar teks"
                    className={`rounded-md p-1.5 cursor-pointer ${
                      fontSize === 'lg' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div
                className={`max-w-2xl space-y-4 leading-relaxed text-slate-800 ${
                  fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'
                }`}
              >
                {book.excerptContent.split('\n\n').map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
