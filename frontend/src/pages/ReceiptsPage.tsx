import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/utils';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReceipts().then((r) => setReceipts(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
        <p className="text-gray-500 mt-1">{receipts.length} receipts generated</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
        </div>
      ) : receipts.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No receipts yet</p>
          <p className="text-sm mt-1">Receipts are auto-generated for confirmed income transactions</p>
        </div>
      ) : (
        <div className="card p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sent To</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipts.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{r.referenceNumber}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(r.transaction?.amount || 0)}</td>
                  <td className="px-4 py-3 text-gray-500">{r.sentToPhone || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
