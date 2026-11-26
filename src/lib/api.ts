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
} from '../types';

export interface BootstrapStatus {
  adminClaimed: boolean;
  envPasscodeConfigured: boolean;
  canClaimFirstAdmin: boolean;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export interface ReportsResponse {
  reports: AutoReport[];
  schedule: ReportScheduleConfig;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `Permintaan gagal (${res.status})`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody?.error) message = errBody.error;
    } catch {
      // Ignore parse error
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export const api = {
  getBootstrapStatus: () => request<BootstrapStatus>('/api/auth/bootstrap-status'),

  claimAdmin: (body: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/api/auth/claim-admin', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  loginWithAdminPasscode: (body: { passcode: string; name?: string; email?: string }) =>
    request<AuthResponse>('/api/auth/admin-passcode', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  register: (body: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: (token: string) => request<{ user: PublicUser }>('/api/auth/me', {}, token),

  getStats: () => request<LibraryStats>('/api/stats'),

  getBooks: () => request<Book[]>('/api/books'),

  createBook: (
    body: Omit<Book, 'id' | 'availableCopies' | 'borrowCount' | 'createdAt' | 'updatedAt'>,
    token: string
  ) =>
    request<Book>(
      '/api/books',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      token
    ),

  updateBook: (id: string, body: Partial<Book>, token: string) =>
    request<Book>(
      `/api/books/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      token
    ),

  deleteBook: (id: string, token: string) =>
    request<{ deletedId: string }>(
      `/api/books/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token
    ),

  getLoans: (token: string) => request<Loan[]>('/api/loans', {}, token),

  borrowBook: (bookId: string, days: number, token: string) =>
    request<Loan>(
      '/api/loans',
      {
        method: 'POST',
        body: JSON.stringify({ bookId, days }),
      },
      token
    ),

  returnLoan: (loanId: string, token: string) =>
    request<Loan>(
      `/api/loans/${encodeURIComponent(loanId)}/return`,
      { method: 'POST' },
      token
    ),

  renewLoan: (loanId: string, token: string) =>
    request<Loan>(
      `/api/loans/${encodeURIComponent(loanId)}/renew`,
      { method: 'POST' },
      token
    ),

  getReservations: (token: string) => request<Reservation[]>('/api/reservations', {}, token),

  createReservation: (bookId: string, token: string) =>
    request<Reservation>(
      '/api/reservations',
      {
        method: 'POST',
        body: JSON.stringify({ bookId }),
      },
      token
    ),

  cancelReservation: (id: string, token: string) =>
    request<Reservation>(
      `/api/reservations/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      token
    ),

  getActivities: (token?: string | null) =>
    request<ActivityLog[]>('/api/activities', {}, token),

  getMembers: (token: string) => request<MemberDirectoryItem[]>('/api/members', {}, token),

  updateMemberStatus: (id: string, status: 'active' | 'suspended', token: string) =>
    request<PublicUser>(
      `/api/members/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      token
    ),

  getReports: (token: string) => request<ReportsResponse>('/api/reports', {}, token),

  generateReport: (frequency: ReportFrequency | 'manual', token: string) =>
    request<AutoReport>(
      '/api/reports/generate',
      {
        method: 'POST',
        body: JSON.stringify({ frequency }),
      },
      token
    ),

  updateReportSchedule: (
    body: { enabled?: boolean; frequency?: ReportFrequency },
    token: string
  ) =>
    request<ReportScheduleConfig>(
      '/api/reports/schedule',
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      token
    ),

  downloadReportCsv: async (reportId: string, reportCode: string, token: string) => {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('Gagal mengunduh berkas CSV laporan.');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportCode}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
