import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate, getSourceIcon, getStatusColor } from '../lib/utils';
import TrendChart from '../components/dashboard/TrendChart';
import CategoryBreakdown from '../components/dashboard/CategoryBreakdown';

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardOverview(),
      api.getDashboardTrend(6),
      api.getDashboardCategories(),
      api.getRecentTransactions(8),
    ])
      .then(([ov, tr, cat, rec]) => {
        setOverview(ov);
        setTrend(tr);
        setCategories(cat);
        setRecent(rec);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const thisMonth = overview?.thisMonth || { income: 0, expense: 0, net: 0 };
  const lastMonth = overview?.lastMonth || { income: 0, expense: 0 };

  const incomeChange = lastMonth.income > 0
    ? ((thisMonth.income - lastMonth.income) / lastMonth.income * 100).toFixed(1)
    : '0';
  const expenseChange = lastMonth.expense > 0
    ? ((thisMonth.expense - lastMonth.expense) / lastMonth.expense * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Your financial overview</p>
        </div>
        <div className="flex gap-3">
          <Link to="/ledger" className="btn-secondary text-sm">View Ledger</Link>
          <Link to="/invoices" className="btn-primary text-sm">New Invoice</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Income This Month</p>
              <p className="text-2xl font-bold text-income mt-1">{formatCurrency(thisMonth.income)}</p>
              <p className="text-xs text-gray-400 mt-1">{thisMonth.incomeCount} transactions</p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-income" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            {Number(incomeChange) >= 0 ? (
              <ArrowUpRight className="w-3 h-3 text-income" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-expense" />
            )}
            <span className={Number(incomeChange) >= 0 ? 'text-income' : 'text-expense'}>
              {Math.abs(Number(incomeChange))}%
            </span>
            <span className="text-gray-400">vs last month</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Expenses This Month</p>
              <p className="text-2xl font-bold text-expense mt-1">{formatCurrency(thisMonth.expense)}</p>
              <p className="text-xs text-gray-400 mt-1">{thisMonth.expenseCount} transactions</p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-expense" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            {Number(expenseChange) <= 0 ? (
              <ArrowDownRight className="w-3 h-3 text-income" />
            ) : (
              <ArrowUpRight className="w-3 h-3 text-expense" />
            )}
            <span className={Number(expenseChange) <= 0 ? 'text-income' : 'text-expense'}>
              {Math.abs(Number(expenseChange))}%
            </span>
            <span className="text-gray-400">vs last month</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Net This Month</p>
              <p className={`text-2xl font-bold mt-1 ${thisMonth.net >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(thisMonth.net)}
              </p>
            </div>
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-brand-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-2xl font-bold text-pending mt-1">{overview?.pendingReview || 0}</p>
              <p className="text-xs text-gray-400 mt-1">needs attention</p>
            </div>
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-pending" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
          <TrendChart data={trend} />
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Top Categories</h3>
          <CategoryBreakdown data={categories.slice(0, 5)} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
          <Link to="/ledger" className="text-sm text-brand-600 hover:text-brand-700">View all</Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No transactions yet</p>
            <p className="text-sm mt-1">Send a WhatsApp voice note to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((txn: any) => (
              <Link
                key={txn.id}
                to={`/ledger/${txn.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getSourceIcon(txn.sourceType)}</span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {txn.counterpartyName || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {txn.category?.name || 'Uncategorized'} · {formatDate(txn.transactionDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${txn.direction === 'in' ? 'text-income' : 'text-expense'}`}>
                    {txn.direction === 'in' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(txn.status)}`}>
                    {txn.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
