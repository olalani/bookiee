const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('bookiee_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('bookiee_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  signup: (data: { phoneNumber: string; password: string; businessName: string; businessType?: string }) =>
    request<{ accessToken: string; user: any }>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { phoneNumber: string; password: string }) =>
    request<{ accessToken: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => request<any>('/auth/me'),

  // Dashboard
  getDashboardOverview: () => request<any>('/dashboard/overview'),
  getDashboardTrend: (months?: number) => request<any>(`/dashboard/trend${months ? `?months=${months}` : ''}`),
  getDashboardCategories: () => request<any>('/dashboard/categories'),
  getRecentTransactions: (limit?: number) => request<any>(`/dashboard/recent${limit ? `?limit=${limit}` : ''}`),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/transactions${query}`);
  },
  getTransaction: (id: string) => request<any>(`/transactions/${id}`),
  createTransaction: (data: any) => request<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: string, data: any) => request<any>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  confirmTransaction: (id: string) => request<any>(`/transactions/${id}/confirm`, { method: 'PATCH' }),
  discardTransaction: (id: string) => request<any>(`/transactions/${id}/discard`, { method: 'PATCH' }),
  exportTransactions: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/transactions/export${query}`);
  },

  // Categories
  getCategories: () => request<any>('/categories'),
  createCategory: (name: string) => request<any>('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteCategory: (id: string) => request<any>(`/categories/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: () => request<any>('/products'),
  createProduct: (data: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request<any>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),
  generateCatalog: () => request<any>('/products/catalog/share', { method: 'POST' }),

  // Invoices
  getInvoices: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/invoices${query}`);
  },
  getInvoice: (id: string) => request<any>(`/invoices/${id}`),
  createInvoice: (data: any) => request<any>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  generatePaymentLink: (id: string) => request<any>(`/invoices/${id}/payment-link`, { method: 'POST' }),
  markInvoiceAsPaid: (id: string) => request<any>(`/invoices/${id}/mark-paid`, { method: 'POST' }),
  sendInvoiceFollowUp: (id: string) => request<any>(`/invoices/${id}/follow-up`, { method: 'POST' }),

  // Payroll
  getStaff: () => request<any>('/payroll/staff'),
  addStaff: (data: any) => request<any>('/payroll/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => request<any>(`/payroll/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getPayrollPeriods: () => request<any>('/payroll/periods'),
  generatePayroll: (data: { periodStart: string; periodEnd: string }) =>
    request<any>('/payroll/generate', { method: 'POST', body: JSON.stringify(data) }),
  getPayrollPeriod: (id: string) => request<any>(`/payroll/periods/${id}`),
  markPayrollPaid: (id: string) => request<any>(`/payroll/periods/${id}/mark-paid`, { method: 'POST' }),

  // Team
  getTeamMembers: () => request<any>('/team/members'),
  inviteMember: (data: { phoneNumber: string; role: string }) =>
    request<any>('/team/invite', { method: 'POST', body: JSON.stringify(data) }),
  updateMemberRole: (userId: string, role: string) =>
    request<any>(`/team/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  revokeMember: (userId: string) => request<any>(`/team/members/${userId}`, { method: 'DELETE' }),
  getAuditLog: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/team/audit-log${query}`);
  },

  // Dead Letter
  getDeadLetterItems: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/dead-letter${query}`);
  },
  resolveDeadLetter: (id: string) => request<any>(`/dead-letter/${id}/resolve`, { method: 'POST' }),
  dismissDeadLetter: (id: string) => request<any>(`/dead-letter/${id}/dismiss`, { method: 'POST' }),

  // Receipts
  getReceipts: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/receipts${query}`);
  },
  generateReceipt: (transactionId: string) =>
    request<any>(`/receipts/generate/${transactionId}`, { method: 'POST' }),
  sendReceipt: (id: string, phoneNumber: string) =>
    request<any>(`/receipts/${id}/send`, { method: 'POST', body: JSON.stringify({ phoneNumber }) }),

  // Business
  getBusiness: () => request<any>('/businesses/current'),
  updateBusiness: (data: any) => request<any>('/businesses/current', { method: 'PATCH', body: JSON.stringify(data) }),
};
