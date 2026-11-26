import crypto from 'node:crypto';
import type { AutoReport, CategoryUtilization, ReportFrequency } from '../src/types.ts';
import { libraryStore } from './store.ts';

function formatIndonesianDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getFrequencyLabel(freq: ReportFrequency | 'manual'): string {
  if (freq === 'daily') return 'Harian';
  if (freq === 'weekly') return 'Mingguan';
  if (freq === 'monthly') return 'Bulanan';
  return 'Insidental';
}

export async function generateLibraryReport(params: {
  trigger: 'scheduled' | 'manual';
  frequency?: ReportFrequency | 'manual';
  generatedBy: string;
}): Promise<{ report: AutoReport; activity: ReturnType<typeof libraryStore.getActivities>[number] }> {
  const stats = libraryStore.getStats();
  const books = libraryStore.getBooks();
  const loans = libraryStore.getAllRawLoans();
  const now = new Date().toISOString();
  const existingCount = libraryStore.getReports().length + 1;
  const freq = params.frequency ?? libraryStore.getReportSchedule().frequency;

  const returnedLoans = loans.filter((l) => l.status === 'returned').length;
  const borrowedOrOverdue = Math.max(0, stats.totalCopies - stats.availableCopies);
  const utilizationRate =
    stats.totalCopies > 0 ? Math.round((borrowedOrOverdue / stats.totalCopies) * 1000) / 10 : 0;

  const categoryMap = new Map<string, CategoryUtilization>();
  for (const book of books) {
    const current = categoryMap.get(book.category) ?? {
      category: book.category,
      titles: 0,
      totalCopies: 0,
      activeLoans: 0,
      totalBorrows: 0,
    };
    current.titles += 1;
    current.totalCopies += book.totalCopies;
    current.activeLoans += book.totalCopies - book.availableCopies;
    current.totalBorrows += book.borrowCount;
    categoryMap.set(book.category, current);
  }

  const topBooks = [...books]
    .sort((a, b) => b.borrowCount - a.borrowCount)
    .slice(0, 5)
    .map((b) => ({
      bookId: b.id,
      title: b.title,
      author: b.author,
      category: b.category,
      borrowCount: b.borrowCount,
    }));

  const reportCode = `LAP-${new Date().getFullYear()}-${String(existingCount).padStart(3, '0')}`;
  const report: AutoReport = {
    id: `rep-${crypto.randomUUID().slice(0, 8)}`,
    reportCode,
    title: `Laporan Sirkulasi & Koleksi ${getFrequencyLabel(freq)}`,
    frequency: freq,
    trigger: params.trigger,
    generatedAt: now,
    generatedBy: params.generatedBy,
    periodLabel: formatIndonesianDate(now),
    metrics: {
      totalTitles: stats.totalTitles,
      totalCopies: stats.totalCopies,
      availableCopies: stats.availableCopies,
      utilizationRate,
      activeLoans: stats.activeLoans,
      overdueLoans: stats.overdueLoans,
      returnedLoans,
      totalBorrowsAllTime: stats.totalBorrowsAllTime,
      totalReservationsWaiting: stats.waitingReservations,
      totalFinesRp: stats.totalFinesRp,
      registeredMembers: stats.registeredMembers,
    },
    topBooks,
    categoryBreakdown: Array.from(categoryMap.values()).sort(
      (a, b) => b.totalBorrows - a.totalBorrows
    ),
  };

  return libraryStore.saveReport(report, params.generatedBy);
}

function escapeCsvCell(value: string | number): string {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildReportCsv(report: AutoReport): string {
  const lines: string[] = [];
  lines.push(['KAJILIB — LAPORAN PERPUSTAKAAN DIGITAL', report.reportCode].map(escapeCsvCell).join(','));
  lines.push(['Judul Laporan', report.title].map(escapeCsvCell).join(','));
  lines.push(['Periode', report.periodLabel].map(escapeCsvCell).join(','));
  lines.push(['Pemicu', report.trigger === 'scheduled' ? 'Otomatis Terjadwal' : 'Manual'].map(escapeCsvCell).join(','));
  lines.push(['Diterbitkan Oleh', report.generatedBy].map(escapeCsvCell).join(','));
  lines.push(['Waktu Terbit', report.generatedAt].map(escapeCsvCell).join(','));
  lines.push('');

  lines.push(['RINGKASAN METRIK', 'NILAI'].map(escapeCsvCell).join(','));
  lines.push(['Total Judul Koleksi', report.metrics.totalTitles].map(escapeCsvCell).join(','));
  lines.push(['Total Eksemplar', report.metrics.totalCopies].map(escapeCsvCell).join(','));
  lines.push(['Eksemplar Tersedia', report.metrics.availableCopies].map(escapeCsvCell).join(','));
  lines.push(['Rasio Utilisasi (%)', report.metrics.utilizationRate].map(escapeCsvCell).join(','));
  lines.push(['Peminjaman Aktif', report.metrics.activeLoans].map(escapeCsvCell).join(','));
  lines.push(['Peminjaman Terlambat', report.metrics.overdueLoans].map(escapeCsvCell).join(','));
  lines.push(['Peminjaman Selesai', report.metrics.returnedLoans].map(escapeCsvCell).join(','));
  lines.push(['Akumulasi Sirkulasi', report.metrics.totalBorrowsAllTime].map(escapeCsvCell).join(','));
  lines.push(['Antrean Reservasi', report.metrics.totalReservationsWaiting].map(escapeCsvCell).join(','));
  lines.push(['Total Denda (Rp)', report.metrics.totalFinesRp].map(escapeCsvCell).join(','));
  lines.push(['Anggota Terdaftar', report.metrics.registeredMembers].map(escapeCsvCell).join(','));
  lines.push('');

  lines.push(['DISTRIBUSI KATEGORI', 'Judul', 'Eksemplar', 'Dipinjam Aktif', 'Total Sirkulasi'].map(escapeCsvCell).join(','));
  for (const cat of report.categoryBreakdown) {
    lines.push(
      [cat.category, cat.titles, cat.totalCopies, cat.activeLoans, cat.totalBorrows]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  lines.push('');

  lines.push(['KOLEKSI TERPOPULER', 'Judul', 'Penulis', 'Kategori', 'Total Dipinjam'].map(escapeCsvCell).join(','));
  report.topBooks.forEach((b, idx) => {
    lines.push(
      [`#${idx + 1}`, b.title, b.author, b.category, b.borrowCount]
        .map(escapeCsvCell)
        .join(',')
    );
  });

  // UTF-8 BOM for clean Excel opening
  return '\uFEFF' + lines.join('\r\n');
}
