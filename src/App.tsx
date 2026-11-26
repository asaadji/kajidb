import { useCallback, useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Navbar, type AppView } from './components/Navbar';
import { CatalogView } from './components/CatalogView';
import { MemberDashboardView } from './components/MemberDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { ReportsView } from './components/ReportsView';
import { BookReaderModal } from './components/BookReaderModal';
import { AuthPanel } from './components/AuthPanel';
import { api } from './lib/api';
import type {
  ActivityLog,
  AutoReport,
  Book,
  LibraryStats,
  Loan,
  MemberDirectoryItem,
  PublicUser,
  ReportFrequency,
  ReportScheduleConfig,
  Reservation,
  WsEvent,
} from './types';

interface ToastMessage {
  id: string;
  kind: 'success' | 'error';
  text: string;
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('catalog');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [members, setMembers] = useState<MemberDirectoryItem[]>([]);
  const [reports, setReports] = useState<AutoReport[]>([]);
  const [reportSchedule, setReportSchedule] = useState<ReportScheduleConfig | null>(null);

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [busyBookId, setBusyBookId] = useState<string | null>(null);
  const [busyLoanId, setBusyLoanId] = useState<string | null>(null);
  const [busyReservationId, setBusyReservationId] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const showToast = useCallback((kind: 'success' | 'error', text: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToast({ id, kind, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  }, []);

  const loadPublicData = useCallback(async (authToken?: string | null) => {
    try {
      const [booksRes, statsRes, activitiesRes] = await Promise.all([
        api.getBooks(),
        api.getStats(),
        api.getActivities(authToken),
      ]);
      setBooks(booksRes);
      setStats(statsRes);
      setActivities(activitiesRes);
    } catch (err) {
      console.error('Gagal memuat data awal:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const loadProtectedData = useCallback(async (authUser: PublicUser, authToken: string) => {
    try {
      const [loansRes, reservationsRes, activitiesRes] = await Promise.all([
        api.getLoans(authToken),
        api.getReservations(authToken),
        api.getActivities(authToken),
      ]);
      setLoans(loansRes);
      setReservations(reservationsRes);
      setActivities(activitiesRes);

      if (authUser.role === 'admin') {
        const [membersRes, reportsRes] = await Promise.all([
          api.getMembers(authToken),
          api.getReports(authToken),
        ]);
        setMembers(membersRes);
        setReports(reportsRes.reports);
        setReportSchedule(reportsRes.schedule);
      } else {
        setMembers([]);
        setReports([]);
        setReportSchedule(null);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memuat data pengguna.');
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    void loadPublicData(null);
  }, [loadPublicData]);

  // WebSocket real-time connection with auto-reconnect and idempotent event reconciliation
  useEffect(() => {
    let disposed = false;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        if (tokenRef.current) {
          ws.send(JSON.stringify({ type: 'auth', token: tokenRef.current }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsEvent;
          switch (msg.type) {
            case 'stats:updated':
              setStats(msg.payload as LibraryStats);
              break;
            case 'book:created': {
              const created = msg.payload as Book;
              setBooks((prev) =>
                prev.some((b) => b.id === created.id) ? prev : [created, ...prev]
              );
              break;
            }
            case 'book:updated': {
              const updated = msg.payload as Book;
              setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
              break;
            }
            case 'book:deleted': {
              const { id } = msg.payload as { id: string };
              setBooks((prev) => prev.filter((b) => b.id !== id));
              break;
            }
            case 'loan:created': {
              const created = msg.payload as Loan;
              setLoans((prev) =>
                prev.some((l) => l.id === created.id) ? prev : [created, ...prev]
              );
              break;
            }
            case 'loan:updated': {
              const updated = msg.payload as Loan;
              setLoans((prev) =>
                prev.some((l) => l.id === updated.id)
                  ? prev.map((l) => (l.id === updated.id ? updated : l))
                  : [updated, ...prev]
              );
              break;
            }
            case 'reservation:updated': {
              const updated = msg.payload as Reservation;
              setReservations((prev) =>
                prev.some((r) => r.id === updated.id)
                  ? prev.map((r) => (r.id === updated.id ? updated : r))
                  : [updated, ...prev]
              );
              break;
            }
            case 'activity:new': {
              const act = msg.payload as ActivityLog;
              setActivities((prev) =>
                prev.some((a) => a.id === act.id) ? prev : [act, ...prev].slice(0, 80)
              );
              break;
            }
            case 'member:updated':
              setMembers(msg.payload as MemberDirectoryItem[]);
              break;
            case 'report:generated': {
              const rep = msg.payload as AutoReport;
              setReports((prev) =>
                prev.some((r) => r.id === rep.id) ? prev : [rep, ...prev]
              );
              break;
            }
            default:
              break;
          }
        } catch {
          // Ignore malformed message
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!disposed) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  // Re-authenticate active WebSocket whenever auth token changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'auth', token: token ?? '' }));
    }
  }, [token]);

  const handleAuthSuccess = async (authUser: PublicUser, authToken: string) => {
    setUser(authUser);
    setToken(authToken);
    setAuthModalOpen(false);
    await loadProtectedData(authUser, authToken);
    showToast(
      'success',
      `Selamat datang, ${authUser.name} (${authUser.role === 'admin' ? 'Administrator' : 'Anggota'})`
    );
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setLoans([]);
    setReservations([]);
    setMembers([]);
    setReports([]);
    setReportSchedule(null);
    void loadPublicData(null);
    if (activeView === 'admin' || activeView === 'reports') {
      setActiveView('catalog');
    }
    showToast('success', 'Anda telah keluar dari sesi KAJILIB.');
  };

  const handleBorrow = async (bookId: string, days: number) => {
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    setBusyBookId(bookId);
    try {
      const loan = await api.borrowBook(bookId, days, token);
      setLoans((prev) => (prev.some((l) => l.id === loan.id) ? prev : [loan, ...prev]));
      showToast('success', `Berhasil meminjam "${loan.bookTitle}" (${loan.loanCode}).`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal meminjam buku.');
    } finally {
      setBusyBookId(null);
    }
  };

  const handleReserve = async (bookId: string) => {
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    setBusyBookId(bookId);
    try {
      const res = await api.createReservation(bookId, token);
      setReservations((prev) => (prev.some((r) => r.id === res.id) ? prev : [res, ...prev]));
      showToast('success', `Masuk antrean reservasi "${res.bookTitle}" (${res.reservationCode}).`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal membuat reservasi.');
    } finally {
      setBusyBookId(null);
    }
  };

  const handleReturnLoan = async (loanId: string) => {
    if (!token) return;
    setBusyLoanId(loanId);
    try {
      const updated = await api.returnLoan(loanId, token);
      setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      showToast('success', `Buku "${updated.bookTitle}" berhasil dikembalikan.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memproses pengembalian.');
    } finally {
      setBusyLoanId(null);
    }
  };

  const handleRenewLoan = async (loanId: string) => {
    if (!token) return;
    setBusyLoanId(loanId);
    try {
      const updated = await api.renewLoan(loanId, token);
      setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      showToast('success', `Masa pinjam "${updated.bookTitle}" diperpanjang +7 hari.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memperpanjang peminjaman.');
    } finally {
      setBusyLoanId(null);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!token) return;
    setBusyReservationId(reservationId);
    try {
      const updated = await api.cancelReservation(reservationId, token);
      setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast('success', `Antrean reservasi "${updated.bookTitle}" dibatalkan.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal membatalkan reservasi.');
    } finally {
      setBusyReservationId(null);
    }
  };

  const handleCreateBook = async (
    data: Omit<Book, 'id' | 'availableCopies' | 'borrowCount' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!token) return;
    const created = await api.createBook(data, token);
    setBooks((prev) => (prev.some((b) => b.id === created.id) ? prev : [created, ...prev]));
    showToast('success', `Koleksi "${created.title}" ditambahkan ke katalog.`);
  };

  const handleUpdateBook = async (id: string, data: Partial<Book>) => {
    if (!token) return;
    const updated = await api.updateBook(id, data, token);
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    showToast('success', `Koleksi "${updated.title}" diperbarui.`);
  };

  const handleDeleteBook = async (id: string) => {
    if (!token) return;
    try {
      await api.deleteBook(id, token);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      showToast('success', 'Koleksi berhasil dihapus dari katalog.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus koleksi.');
    }
  };

  const handleToggleMemberStatus = async (
    memberId: string,
    nextStatus: 'active' | 'suspended'
  ) => {
    if (!token) return;
    try {
      await api.updateMemberStatus(memberId, nextStatus, token);
      const updatedMembers = await api.getMembers(token);
      setMembers(updatedMembers);
      showToast(
        'success',
        `Status anggota diperbarui menjadi ${nextStatus === 'active' ? 'Aktif' : 'Ditangguhkan'}.`
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memperbarui status anggota.');
    }
  };

  const handleGenerateReport = async (frequency: ReportFrequency | 'manual') => {
    if (!token) return;
    setReportBusy(true);
    try {
      const report = await api.generateReport(frequency, token);
      setReports((prev) => (prev.some((r) => r.id === report.id) ? prev : [report, ...prev]));
      showToast('success', `Laporan ${report.reportCode} berhasil diterbitkan.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal membuat laporan.');
    } finally {
      setReportBusy(false);
    }
  };

  const handleUpdateSchedule = async (patch: { enabled?: boolean; frequency?: ReportFrequency }) => {
    if (!token) return;
    try {
      const updated = await api.updateReportSchedule(patch, token);
      setReportSchedule(updated);
      showToast('success', 'Jadwal pelaporan otomatis diperbarui.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengubah jadwal.');
    }
  };

  const handleDownloadCsv = async (reportId: string, reportCode: string) => {
    if (!token) return;
    try {
      await api.downloadReportCsv(reportId, reportCode, token);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengunduh CSV.');
    }
  };

  const selectedBook = books.find((b) => b.id === selectedBookId) ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        activeView={activeView}
        onNavigate={setActiveView}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-lg"
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 text-red-700 shrink-0" />
          )}
          <p className="text-xs font-medium leading-relaxed text-slate-800">{toast.text}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {loadingInitial ? (
          <div className="space-y-6">
            <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="h-28 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeView === 'catalog' && (
              <CatalogView
                books={books}
                stats={stats}
                user={user}
                loans={loans}
                reservations={reservations}
                busyBookId={busyBookId}
                onSelectBook={(book) => setSelectedBookId(book.id)}
                onBorrow={handleBorrow}
                onReserve={handleReserve}
                onRequireAuth={() => setAuthModalOpen(true)}
                onGoToDashboard={() =>
                  setActiveView(user?.role === 'admin' ? 'admin' : 'member')
                }
              />
            )}

            {activeView === 'member' && (
              <MemberDashboardView
                user={user}
                books={books}
                loans={loans}
                reservations={reservations}
                activities={activities}
                wsConnected={wsConnected}
                busyLoanId={busyLoanId}
                busyReservationId={busyReservationId}
                onAuthSuccess={handleAuthSuccess}
                onReturnLoan={handleReturnLoan}
                onRenewLoan={handleRenewLoan}
                onCancelReservation={handleCancelReservation}
                onOpenBook={(book) => setSelectedBookId(book.id)}
                onGoToCatalog={() => setActiveView('catalog')}
              />
            )}

            {activeView === 'admin' && (
              <AdminDashboardView
                user={user}
                books={books}
                loans={loans}
                members={members}
                activities={activities}
                stats={stats}
                wsConnected={wsConnected}
                onAuthSuccess={handleAuthSuccess}
                onCreateBook={handleCreateBook}
                onUpdateBook={handleUpdateBook}
                onDeleteBook={handleDeleteBook}
                onReturnLoan={handleReturnLoan}
                onToggleMemberStatus={handleToggleMemberStatus}
              />
            )}

            {activeView === 'reports' && (
              <ReportsView
                user={user}
                reports={reports}
                schedule={reportSchedule}
                busy={reportBusy}
                onAuthSuccess={handleAuthSuccess}
                onGenerateNow={handleGenerateReport}
                onUpdateSchedule={handleUpdateSchedule}
                onDownloadCsv={handleDownloadCsv}
              />
            )}
          </>
        )}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-medium text-slate-700">
            KAJILIB · Sistem Perpustakaan Digital & Sirkulasi Terpadu
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveView('catalog')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Katalog Koleksi
            </button>
            <button
              type="button"
              onClick={() => setActiveView('member')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Portal Anggota
            </button>
            <button
              type="button"
              onClick={() => setActiveView('reports')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Laporan Otomatis
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Konsol Admin
            </button>
          </div>
        </div>
      </footer>

      {/* Book Detail & Reader Modal */}
      {selectedBook && (
        <BookReaderModal
          book={selectedBook}
          user={user}
          isBorrowedByUser={loans.some(
            (l) => l.bookId === selectedBook.id && l.status !== 'returned'
          )}
          isReservedByUser={reservations.some(
            (r) =>
              r.bookId === selectedBook.id &&
              (r.status === 'waiting' || r.status === 'ready')
          )}
          busy={busyBookId === selectedBook.id}
          onClose={() => setSelectedBookId(null)}
          onBorrow={handleBorrow}
          onReserve={handleReserve}
          onRequireAuth={() => {
            setSelectedBookId(null);
            setAuthModalOpen(true);
          }}
        />
      )}

      {/* Auth Modal */}
      {authModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg">
            <AuthPanel
              compact
              onSuccess={handleAuthSuccess}
              onCancel={() => setAuthModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
