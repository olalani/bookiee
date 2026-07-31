import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/utils';

export default function DeadLetterPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadItems = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter) params.status = filter;
      const result = await api.getDeadLetterItems(params);
      setItems(result.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, [filter]);

  const handleResolve = async (id: string) => {
    await api.resolveDeadLetter(id);
    loadItems();
  };

  const handleDismiss = async (id: string) => {
    await api.dismissDeadLetter(id);
    loadItems();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
        <p className="text-gray-500 mt-1">Failed or low-confidence voice parses</p>
      </div>

      <div className="flex gap-2">
        {['', 'pending', 'resolved', 'dismissed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto text-green-300 mb-3" />
          <p>Queue is clear!</p>
          <p className="text-sm mt-1">No items need review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item: any) => (
            <div key={item.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-pending mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{item.errorReason}</p>
                    <p className="text-sm text-gray-500 mt-1">{formatDateTime(item.createdAt)}</p>
                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded-lg overflow-x-auto max-w-lg">
                      {JSON.stringify(item.rawPayload, null, 2)}
                    </pre>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  item.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {item.status}
                </span>
              </div>
              {item.status === 'pending' && (
                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                  <button onClick={() => handleResolve(item.id)} className="btn-primary text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Resolve
                  </button>
                  <button onClick={() => handleDismiss(item.id)} className="btn-secondary text-sm flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
