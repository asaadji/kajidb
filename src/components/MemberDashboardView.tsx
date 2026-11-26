import { useMemo } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  RefreshCw,
  RotateCcw,
  Radio,
} from 'lucide-react';
import { AuthPanel } from './AuthPanel';
import { daysRemaining, formatDateId, formatRp, formatTimeId } from '../lib/format';
import type { ActivityLog, Book, Loan, PublicUser, Reservation } from '../types';

interface MemberDashboardViewProps {
  user: PublicUser | null;
  books: Book[];
  loans: Loan[];
  reservations: Reservation[];
  activities: ActivityLog[];
  wsConnected: boolean;
  busyLoanId: string | null;
  busyReservationId: string | null;
  onAuthSuccess: (user: PublicUser, token: string) => void;
  onReturnLoan: (loanId: string) => void;
  onRenewLoan: (loanId: string) => void;
  onCancelReservation: (reservationId: string) => void;
  onOpenBook: (book: Book) => void;
  onGoToCatalog: () => void;
}

export function MemberDashboardView({
  user,
  books,
  loans,
  reservations,
  activities,
  wsConnected,
  busyLoanId,
  busyReservationId,
  onAuthSuccess,
  onReturnLoan,
  onRenewLoan,
  onCancelReservation,
  onOpenBook,
  onGoToCatalog,
}: MemberDashboardViewProps) {
  const activeLoans = useMemo(
    () => loans.filter((l) => l.status !== 'returned'),
    [loans]
  );
  const returnedLoans = useMemo(
    () => loans.filter((l) => l.status === 'returned'),
    [loans]
  );
  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status === 'waiting' || r.status === 'ready'),
    [reservations]
  );
  const totalFines = useMemo(
    () => loans.reduce((sum, l) => sum + l.fineAmount, 0),
    [loans]
  );

  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-6">
        <AuthPanel defaultMode="member-login" onSuccess={onAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Member Identity */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Dashboard Anggota · <span className="font-mono">{user.memberCode}</span> · {user.email}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-900">
            Selamat datang, {user.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              wsConnected ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            {wsConnected ? 'Pemantauan Real-Time Terhubung' : 'Menghubungkan ulang...'}
          </span>
          <button
            type="button"
            onClick={onGoToCatalog}
            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            Pinjam Buku Baru
          </button>
        </div>
      </div>

      {/* Member KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Pinjaman Aktif</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {activeLoans.length} / 5
          </p>
          <p className="mt-1 text-xs text-slate-500">Maksimal 5 buku bersamaan</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Antrean Reservasi</p>
          <p className="mt-2 font-display text-2xl font-bold text-amber-700 tabular-nums">
            {activeReservations.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Menunggu ketersediaan stok</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Riwayat Dikembalikan</p>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            {returnedLoans.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total peminjaman selesai</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Akumulasi Denda</p>
          <p
            className={`mt-2 font-display text-2xl font-bold tabular-nums ${
              totalFines > 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {formatRp(totalFines)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tarif keterlambatan Rp 2.000/hari</p>
        </div>
      </div>

      {/* Main Split: Active Loans + Real-Time Monitor */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 8 cols: Active Loans & Reservations */}
        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Peminjaman Aktif Anda
              </h2>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {activeLoans.length} transaksi
              </span>
            </div>

            {activeLoans.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-800">
                  Belum ada buku yang sedang dipinjam
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Jelajahi katalog KAJILIB untuk meminjam buku referensi atau literatur pilihan.
                </p>
                <button
                  type="button"
                  onClick={onGoToCatalog}
                  className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Lihat Katalog Buku
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeLoans.map((loan) => {
                  const remain = daysRemaining(loan.dueAt);
                  const isOverdue = loan.status === 'overdue' || remain < 0;
                  const bookRef = books.find((b) => b.id === loan.bookId);
                  const isBusy = busyLoanId === loan.id;

                  return (
                    <div
                      key={loan.id}
                      className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-medium text-slate-700">
                            {loan.loanCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">Rak {loan.shelfCode}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            Perpanjang {loan.renewCount}/{loan.maxRenewals}
                          </span>
                        </div>

                        <h3 className="font-display text-base font-bold text-slate-900 truncate">
                          {loan.bookTitle}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-slate-600 tabular-nums">
                            Pinjam: {formatDateId(loan.borrowedAt)}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            |
                          </span>
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-red-700 tabular-nums">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Terlambat · Jatuh tempo {formatDateId(loan.dueAt)} (Denda{' '}
                              {formatRp(loan.fineAmount)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 tabular-nums">
                              <Clock className="h-3.5 w-3.5" />
                              Jatuh tempo {formatDateId(loan.dueAt)} ({remain} hari lagi)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {bookRef && (
                          <button
                            type="button"
                            onClick={() => onOpenBook(bookRef)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                          >
                            Baca
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={
                            isBusy || isOverdue || loan.renewCount >= loan.maxRenewals
                          }
                          onClick={() => onRenewLoan(loan.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-45 cursor-pointer whitespace-nowrap"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Perpanjang
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onReturnLoan(loan.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {isBusy ? 'Memproses...' : 'Kembalikan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Reservations Queue */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Antrean Reservasi Buku
              </h2>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {activeReservations.length} aktif
              </span>
            </div>

            {activeReservations.length === 0 ? (
              <div className="px-6 py-8 text-center text-xs text-slate-500">
                Tidak ada antrean reservasi aktif saat ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeReservations.map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-medium text-slate-700">
                          {res.reservationCode}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDateId(res.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 font-display text-sm font-bold text-slate-900">
                        {res.bookTitle}
                      </p>
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        {res.status === 'ready'
                          ? 'Stok tersedia — silakan pinjam melalui katalog sekarang'
                          : 'Menunggu pengembalian eksemplar oleh peminjam sebelumnya'}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={busyReservationId === res.id}
                      onClick={() => onCancelReservation(res.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Batalkan Antrean
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Returned History Table */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Riwayat Pengembalian
              </h2>
              <span className="text-xs text-slate-500 tabular-nums">
                {returnedLoans.length} selesai
              </span>
            </div>

            {returnedLoans.length === 0 ? (
              <div className="px-6 py-8 text-center text-xs text-slate-500">
                Riwayat buku yang sudah Anda kembalikan akan tercatat di sini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Kode</th>
                      <th className="px-4 py-3 font-semibold">Judul Buku</th>
                      <th className="px-4 py-3 font-semibold">Tgl Pinjam</th>
                      <th className="px-4 py-3 font-semibold">Tgl Kembali</th>
                      <th className="px-6 py-3 text-right font-semibold">Denda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnedLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {loan.loanCode}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {loan.bookTitle}
                        </td>
                        <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                          {formatDateId(loan.borrowedAt)}
                        </td>
                        <td className="px-4 py-3 text-emerald-700 tabular-nums whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {loan.returnedAt ? formatDateId(loan.returnedAt) : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          {formatRp(loan.fineAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right 4 cols: Real-Time Activity Stream */}
        <aside className="lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-display text-base font-bold text-slate-900">
                Aktivitas Transaksi Real-Time
              </h2>
              <span className="font-mono text-xs text-slate-500">Live WS</span>
            </div>

            <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
              {activities.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-slate-500">
                  Belum ada aktivitas transaksi tercatat.
                </div>
              ) : (
                activities.slice(0, 20).map((act) => (
                  <div key={act.id} className="px-5 py-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-teal-800">{act.actorName}</span>
                      <time className="font-mono text-slate-400 tabular-nums shrink-0">
                        {formatTimeId(act.timestamp)}
                      </time>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">{act.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
