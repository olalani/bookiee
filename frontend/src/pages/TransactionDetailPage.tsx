import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime, getStatusColor, getSourceIcon } from '../lib/utils';

export default function TransactionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.getTransaction(id).then(setTransaction).finally(() => setLoading(false));
    }
  }, [id]);

  const handleConfirm = async () => {
    if (!id) return;
    await api.confirmTransaction(id);
    setTransaction({ ...transaction, status: 'confirmed' });
  };

  const handleDiscard = async () => {
    if (!id) return;
    await api.discardTransaction(id);
    setTransaction({ ...transaction, status: 'discarded' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!transaction) {
    return <div className="text-center py-12 text-gray-500">Transaction not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Transaction Detail</h1>
            <p className="text-sm text-gray-500 mt-1">Created {formatDateTime(transaction.createdAt)}</p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
            {transaction.status}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Amount</span>
            <span className={`text-2xl font-bold ${transaction.direction === 'in' ? 'text-income' : 'text-expense'}`}>
              {transaction.direction === 'in' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Type</span>
            <span className="font-medium">{transaction.direction === 'in' ? 'Money In' : 'Money Out'}</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">From/To</span>
            <span className="font-medium">{transaction.counterpartyName || 'Unknown'}</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Category</span>
            <span className="font-medium">{transaction.category?.name || 'Uncategorized'}</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Source</span>
            <span className="flex items-center gap-2">
              {getSourceIcon(transaction.sourceType)} {transaction.sourceType}
            </span>
          </div>

          {transaction.confidenceScore && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Confidence</span>
              <span className={`font-medium ${Number(transaction.confidenceScore) >= 0.8 ? 'text-income' : 'text-pending'}`}>
                {(Number(transaction.confidenceScore) * 100).toFixed(0)}%
              </span>
            </div>
          )}

          {transaction.counterpartyPhone && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium">{transaction.counterpartyPhone}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-3">
            <span className="text-gray-500">Date</span>
            <span className="font-medium">{formatDateTime(transaction.transactionDate)}</span>
          </div>
        </div>

        {transaction.status === 'pending' && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-100">
            <button onClick={handleConfirm} className="flex-1 btn-primary flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Confirm
            </button>
            <button onClick={handleDiscard} className="flex-1 btn-danger flex items-center justify-center gap-2">
              <X className="w-4 h-4" /> Discard
            </button>
          </div>
        )}
      </div>

      {transaction.auditLogs && transaction.auditLogs.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">History</h3>
          <div className="space-y-3">
            {transaction.auditLogs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 bg-brand-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-gray-700">
                    <span className="font-medium">{log.changeType}</span>
                    {log.user?.fullName && <span className="text-gray-500"> by {log.user.fullName}</span>}
                  </p>
                  <p className="text-gray-400 text-xs">{formatDateTime(log.changedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
