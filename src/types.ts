export type UserRole = 'admin' | 'member';
export type MemberStatus = 'active' | 'suspended';

export interface PublicUser {
  id: string;
  memberCode: string;
  name: string;
  email: string;
  role: UserRole;
  status: MemberStatus;
  joinedAt: string;
}

export interface StoredUser extends PublicUser {
  passwordHash: string;
  passwordSalt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  year: number;
  pages: number;
  shelfCode: string;
  ddcCode: string;
  coverUrl: string;
  synopsis: string;
  excerptTitle: string;
  excerptContent: string;
  totalCopies: number;
  availableCopies: number;
  borrowCount: number;
  createdAt: string;
  updatedAt: string;
}

export type LoanStatus = 'borrowed' | 'overdue' | 'returned';

export interface Loan {
  id: string;
  loanCode: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  shelfCode: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  renewCount: number;
  maxRenewals: number;
  fineAmount: number;
  status: LoanStatus;
}

export type ReservationStatus = 'waiting' | 'ready' | 'fulfilled' | 'cancelled';

export interface Reservation {
  id: string;
  reservationCode: string;
  bookId: string;
  bookTitle: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  createdAt: string;
  status: ReservationStatus;
}

export type ActivityType =
  | 'borrow'
  | 'return'
  | 'renew'
  | 'reserve'
  | 'reserve_cancel'
  | 'book_add'
  | 'book_update'
  | 'book_delete'
  | 'report_generated'
  | 'member_status';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  actorRole: UserRole | 'system';
  targetId: string;
  targetTitle: string;
  summary: string;
  timestamp: string;
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportScheduleConfig {
  enabled: boolean;
  frequency: ReportFrequency;
  lastGeneratedAt: string | null;
  nextScheduledAt: string | null;
}

export interface CategoryUtilization {
  category: string;
  titles: number;
  totalCopies: number;
  activeLoans: number;
  totalBorrows: number;
}

export interface AutoReport {
  id: string;
  reportCode: string;
  title: string;
  frequency: ReportFrequency | 'manual';
  trigger: 'scheduled' | 'manual';
  generatedAt: string;
  generatedBy: string;
  periodLabel: string;
  metrics: {
    totalTitles: number;
    totalCopies: number;
    availableCopies: number;
    utilizationRate: number;
    activeLoans: number;
    overdueLoans: number;
    returnedLoans: number;
    totalBorrowsAllTime: number;
    totalReservationsWaiting: number;
    totalFinesRp: number;
    registeredMembers: number;
  };
  topBooks: Array<{
    bookId: string;
    title: string;
    author: string;
    category: string;
    borrowCount: number;
  }>;
  categoryBreakdown: CategoryUtilization[];
}

export interface LibraryStats {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  activeLoans: number;
  overdueLoans: number;
  waitingReservations: number;
  registeredMembers: number;
  totalFinesRp: number;
  totalBorrowsAllTime: number;
}

export interface MemberDirectoryItem extends PublicUser {
  activeLoansCount: number;
  overdueLoansCount: number;
  totalBorrowsCount: number;
  totalFinesRp: number;
}

export interface WsEvent {
  type:
    | 'connected'
    | 'book:created'
    | 'book:updated'
    | 'book:deleted'
    | 'loan:created'
    | 'loan:updated'
    | 'reservation:updated'
    | 'activity:new'
    | 'report:generated'
    | 'stats:updated'
    | 'member:updated';
  payload: unknown;
  timestamp: string;
}
