import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Search, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate, getSourceIcon, getStatusColor } from '../lib/utils';

export default function LedgerPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    sourceType: 'manual',
    direction: 'out',
    amount: 0,
    counterpartyName: '',
    counterpartyPhone: '',
    categoryId: '',
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: '',
    sourceType: '',
    status: '',
  });
  const [categories, setCategories] = useState<any[]>([]);

  const loadTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.sourceType) params.sourceType = filters.sourceType;
      if (filters.status) params.status = filters.status;

      const result = await api.getTransactions(params);
      setTransactions(result.data);
      setPagination(result.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getCategories().then(setCategories);
    loadTransactions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.createTransaction(form);
      setShowCreate(false);
      setForm({ sourceType: 'manual', direction: 'out', amount: 0, counterpartyName: '', counterpartyPhone: '', categoryId: '' });
      loadTransactions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create transaction');
    }
  };

  const handleExport = async () => {
    const data = await api.exportTransactions(filters);
    const csv = [
      ['Date', 'Type', 'Direction', 'Amount', 'Party', 'Category', 'Source', 'Status'].join(','),
      ...data.map((t: any) =>
        [
          t.transactionDate,
          t.sourceType,
          t.direction,
          t.amount,
          `"${t.counterpartyName || ''}"`,
          `"${t.category?.name || ''}"`,
          t.sourceType,
          t.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>
          <p className="text-gray-500 mt-1">{pagination.total} transactions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Transaction
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">New Transaction</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{formError}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Direction</label>
                <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} className="input">
                  <option value="out">Expense (out)</option>
                  <option value="in">Income (in)</option>
                </select>
              </div>
              <div>
                <label className="label">Amount (₦)</label>
                <input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="input" required min="1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">To/From</label>
                <input type="text" value={form.counterpartyName} onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })} className="input" placeholder="e.g. Shoprite" />
              </div>
              <div>
                <label className="label">Category</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input">
                  <option value="">Select category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Create Transaction</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Source</label>
            <select
              value={filters.sourceType}
              onChange={(e) => setFilters({ ...filters, sourceType: e.target.value })}
              className="input"
            >
              <option value="">All</option>
              <option value="voice">Voice</option>
              <option value="text">Text</option>
              <option value="manual">Manual</option>
              <option value="invoice">Invoice</option>
              <option value="receipt">Receipt</option>
              <option value="payroll">Payroll</option>
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              className="input"
            >
              <option value="">All</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button onClick={() => loadTransactions(1)} className="btn-primary">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="card p-0">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No transactions found</p>
            <p className="text-sm mt-1">Send a WhatsApp voice note to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((txn: any) => (
                <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(txn.transactionDate)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/ledger/${txn.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {txn.counterpartyName || 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{txn.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="flex items-center gap-1">
                      {getSourceIcon(txn.sourceType)} {txn.sourceType}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${txn.direction === 'in' ? 'text-income' : 'text-expense'}`}>
                    {txn.direction === 'in' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(txn.status)}`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => loadTransactions(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => loadTransactions(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
