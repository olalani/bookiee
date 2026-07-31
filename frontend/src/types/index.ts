export interface User {
  id: string;
  phoneNumber: string;
  fullName: string | null;
}

export interface Business {
  id: string;
  name: string;
  businessType: string | null;
  currency: string;
  autoConfirmThreshold: number;
  onboarded: boolean;
  logoUrl: string | null;
}

export interface Transaction {
  id: string;
  businessId: string;
  sourceType: string;
  direction: 'in' | 'out';
  amount: number;
  counterpartyName: string | null;
  counterpartyPhone: string | null;
  categoryId: string | null;
  confidenceScore: number | null;
  status: string;
  requiresReview: boolean;
  createdBy: string | null;
  transactionDate: string;
  createdAt: string;
  category?: Category;
  creator?: { id: string; fullName: string | null };
  receipts?: Receipt[];
  auditLogs?: AuditLog[];
}

export interface Category {
  id: string;
  name: string;
  isSystemDefault: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stockQty: number;
  imageUrl: string | null;
  active: boolean;
}

export interface Invoice {
  id: string;
  clientName: string;
  clientContact: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  dueDate: string | null;
  paymentLink: string | null;
  followUpCount: number;
  lineItems: InvoiceLineItem[];
  events?: InvoiceEvent[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceEvent {
  id: string;
  eventType: string;
  eventAt: string;
}

export interface Staff {
  id: string;
  fullName: string;
  salaryAmount: number;
  pensionRate: number | null;
  active: boolean;
}

export interface PayrollPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  entries: PayrollEntry[];
}

export interface PayrollEntry {
  id: string;
  staffId: string;
  salarySnapshot: number;
  payeTax: number;
  pensionContribution: number;
  netPay: number;
  staff: Staff;
}

export interface TeamMember {
  id: string;
  user: { id: string; phoneNumber: string; fullName: string | null };
  role: string;
  invitedAt: string;
}

export interface Receipt {
  id: string;
  transactionId: string;
  pdfUrl: string;
  referenceNumber: string;
  sentToPhone: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  changeType: string;
  diff: any;
  changedAt: string;
  user: { id: string; fullName: string | null } | null;
  transaction: { id: string; amount: number; counterpartyName: string | null };
}

export interface DeadLetterItem {
  id: string;
  rawPayload: any;
  errorReason: string;
  status: string;
  createdAt: string;
}

export interface DashboardOverview {
  thisMonth: {
    income: number;
    expense: number;
    net: number;
    incomeCount: number;
    expenseCount: number;
  };
  lastMonth: {
    income: number;
    expense: number;
    net: number;
  };
  totalTransactions: number;
  pendingReview: number;
}

export interface TrendData {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryBreakdown {
  category: string;
  income: number;
  expense: number;
  count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
