import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    clientName: '',
    clientContact: '',
    dueDate: '',
    lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.getInvoices().then((r) => setInvoices(r.data)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.createInvoice(form);
      setShowCreate(false);
      setForm({ clientName: '', clientContact: '', dueDate: '', lineItems: [{ description: '', quantity: 1, unitPrice: 0 }] });
      api.getInvoices().then((r) => setInvoices(r.data));
    } catch (err: any) {
      setFormError(err.message || 'Failed to create invoice');
    }
  };

  const addLineItem = () => {
    setForm({ ...form, lineItems: [...form.lineItems, { description: '', quantity: 1, unitPrice: 0 }] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">{invoices.length} invoices</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {showCreate && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Create Invoice</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{formError}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Client Name</label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Client Contact (phone/email)</label>
                <input
                  type="text"
                  value={form.clientContact}
                  onChange={(e) => setForm({ ...form, clientContact: e.target.value })}
                  className="input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Line Items</label>
              {form.lineItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => {
                      const items = [...form.lineItems];
                      items[idx].description = e.target.value;
                      setForm({ ...form, lineItems: items });
                    }}
                    className="input flex-1"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => {
                      const items = [...form.lineItems];
                      items[idx].quantity = Number(e.target.value);
                      setForm({ ...form, lineItems: items });
                    }}
                    className="input w-20"
                    min="1"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.unitPrice || ''}
                    onChange={(e) => {
                      const items = [...form.lineItems];
                      items[idx].unitPrice = Number(e.target.value);
                      setForm({ ...form, lineItems: items });
                    }}
                    className="input w-32"
                  />
                </div>
              ))}
              <button type="button" onClick={addLineItem} className="text-sm text-brand-600 hover:text-brand-700">
                + Add item
              </button>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Create Invoice</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card p-0">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No invoices yet</p>
            <p className="text-sm mt-1">Create your first invoice to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Due</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/invoices/${inv.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {inv.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatCurrency(inv.amountPaid)}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.dueDate ? formatDate(inv.dueDate) : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(inv.status)}`}>
                      {inv.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
