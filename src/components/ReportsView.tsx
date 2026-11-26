import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Download,
  FileBarChart2,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { AuthPanel } from './AuthPanel';
import { formatDateTimeId, formatRp } from '../lib/format';
import type {
  AutoReport,
  PublicUser,
  ReportFrequency,
  ReportScheduleConfig,
} from '../types';

interface ReportsViewProps {
  user: PublicUser | null;
  reports: AutoReport[];
  schedule: ReportScheduleConfig | null;
  busy: boolean;
  onAuthSuccess: (user: PublicUser, token: string) => void;
  onGenerateNow: (frequency: ReportFrequency | 'manual') => Promise<void>;
  onUpdateSchedule: (patch: { enabled?: boolean; frequency?: ReportFrequency }) => Promise<void>;
  onDownloadCsv: (reportId: string, reportCode: string) => Promise<void>;
}

export function ReportsView({
  user,
  reports,
  schedule,
  busy,
  onAuthSuccess,
  onGenerateNow,
  onUpdateSchedule,
  onDownloadCsv,
}: ReportsViewProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    if (reports.length > 0 && (!selectedReportId || !reports.some((r) => r.id === selectedReportId))) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl py-6 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
          Sistem pelaporan otomatis dan ekspor audit sirkulasi hanya dapat diakses oleh
          administrator perpustakaan KAJILIB.
        </div>
        <AuthPanel defaultMode="admin" onSuccess={onAuthSuccess} />
      </div>
    );
  }

  const activeReport = reports.find((r) => r.id === selectedReportId) ?? reports[0] ?? null;
  const maxCategoryBorrows = activeReport
    ? Math.max(1, ...activeReport.categoryBreakdown.map((c) => c.totalBorrows))
    : 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="no-print flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Sistem Pelaporan Otomatis · Arsip & Audit Sirkulasi
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-900">
            Laporan & Analitik Perpustakaan
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak / PDF
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onGenerateNow(schedule?.frequency ?? 'manual')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Menyusun Laporan...' : 'Terbitkan Laporan Sekarang'}
          </button>
        </div>
      </div>

      {/* Automation Schedule Configuration */}
      <section className="no-print rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 text-teal-700 shrink-0" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Jadwal Penerbitan Laporan Otomatis
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                {schedule?.enabled && schedule.nextScheduledAt
                  ? `Jadwal otomatis aktif · Laporan berikutnya: ${formatDateTimeId(schedule.nextScheduledAt)}`
                  : 'Penerbitan terjadwal sedang dinonaktifkan.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => onUpdateSchedule({ frequency: freq })}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    schedule?.frequency === freq
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {freq === 'daily' ? 'Harian' : freq === 'weekly' ? 'Mingguan' : 'Bulanan'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onUpdateSchedule({ enabled: !(schedule?.enabled ?? true) })}
              className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                schedule?.enabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {schedule?.enabled ? 'Otomasi: Aktif' : 'Otomasi: Nonaktif'}
            </button>
          </div>
        </div>
      </section>

      {/* Main Report Inspector + Archive Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Archive List (Left 4 cols, hidden in print) */}
        <aside className="no-print rounded-xl border border-slate-200 bg-white lg:col-span-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              Arsip Laporan ({reports.length})
            </h2>
            <FileBarChart2 className="h-4 w-4 text-slate-400" />
          </div>

          <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
            {reports.map((rep) => {
              const isSelected = activeReport?.id === rep.id;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`block w-full px-5 py-4 text-left transition-colors cursor-pointer ${
                    isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold text-teal-800">
                      {rep.reportCode}
                    </span>
                    <span className="text-slate-500">
                      {rep.trigger === 'scheduled' ? 'Otomatis' : 'Manual'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{rep.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                    {formatDateTimeId(rep.generatedAt)}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Active Report Detail (Right 8 cols) */}
        <div className="lg:col-span-8">
          {!activeReport ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Belum ada laporan yang diterbitkan. Klik "Terbitkan Laporan Sekarang" untuk membuat
              rekapitulasi pertama.
            </div>
          ) : (
            <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-8">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-xs font-semibold text-teal-800">
                    {activeReport.reportCode} · {activeReport.periodLabel}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
                    {activeReport.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">
                    Diterbitkan oleh {activeReport.generatedBy} pada{' '}
                    {formatDateTimeId(activeReport.generatedAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onDownloadCsv(activeReport.id, activeReport.reportCode)}
                  className="no-print inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Unduh CSV
                </button>
              </div>

              {/* Snapshot Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Utilisasi Koleksi</p>
                  <p className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
                    {activeReport.metrics.utilizationRate}%
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Peminjaman Aktif</p>
                  <p className="mt-1 font-display text-xl font-bold text-teal-800 tabular-nums">
                    {activeReport.metrics.activeLoans}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Terlambat</p>
                  <p className="mt-1 font-display text-xl font-bold text-red-700 tabular-nums">
                    {activeReport.metrics.overdueLoans}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Total Denda</p>
                  <p className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
                    {formatRp(activeReport.metrics.totalFinesRp)}
                  </p>
                </div>
              </div>

              {/* Category Circulation Chart */}
              <div className="space-y-4">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Distribusi Sirkulasi per Kategori
                </h3>
                <div className="space-y-3">
                  {activeReport.categoryBreakdown.map((cat) => {
                    const widthPct = Math.max(
                      6,
                      Math.round((cat.totalBorrows / maxCategoryBorrows) * 100)
                    );
                    return (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800">{cat.category}</span>
                          <span className="font-mono text-slate-600 tabular-nums">
                            {cat.totalBorrows} pinjam · {cat.titles} judul ({cat.totalCopies} eks.)
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-700"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Borrowed Books Table */}
              <div className="space-y-3">
                <h3 className="font-display text-base font-bold text-slate-900">
                  5 Koleksi Paling Sering Dipinjam
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Peringkat</th>
                        <th className="px-4 py-2.5 font-semibold">Judul Koleksi</th>
                        <th className="px-4 py-2.5 font-semibold">Kategori</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Total Pinjam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeReport.topBooks.map((b, idx) => (
                        <tr key={b.bookId}>
                          <td className="px-4 py-2.5 font-mono text-slate-500 tabular-nums">
                            0{idx + 1}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-slate-900">{b.title}</p>
                            <p className="text-slate-500">{b.author}</p>
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">{b.category}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {b.borrowCount}x
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
