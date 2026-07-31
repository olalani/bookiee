import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Send, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDateTime, getStatusColor } from '../lib/utils';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) api.getInvoice(id).then(setInvoice).finally(() => setLoading(false));
  }, [id]);

  const handleGenerateLink = async () => {
    if (!id) return;
    const updated = await api.generatePaymentLink(id);
    setInvoice(updated);
  };

  const handleMarkPaid = async () => {
    if (!id) return;
    await api.markInvoiceAsPaid(id);
    setInvoice({ ...invoice, status: 'paid', amountPaid: invoice.totalAmount });
  };

  const handleFollowUp = async () => {
    if (!id) return;
    await api.sendInvoiceFollowUp(id);
    setInvoice({ ...invoice, followUpCount: invoice.followUpCount + 1 });
  };

  const copyLink = () => {
    if (invoice?.paymentLink) {
      navigator.clipboard.writeText(invoice.paymentLink);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!invoice) return <div className="text-center py-12 text-gray-500">Invoice not found</div>;

  const total = Number(invoice.totalAmount);
  const paid = Number(invoice.amountPaid);
  const progress = total > 0 ? (paid / total) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Invoice to {invoice.clientName}</h1>
            <p className="text-sm text-gray-500 mt-1">{invoice.clientContact}</p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
            {invoice.status.replace('_', ' ')}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Total Amount</span>
            <span className="text-2xl font-bold">{formatCurrency(total)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Amount Paid</span>
            <span className="font-semibold text-income">{formatCurrency(paid)}</span>
          </div>
          {invoice.dueDate && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Due Date</span>
              <span className="font-medium">{formatDateTime(invoice.dueDate)}</span>
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="mt-4">
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-income h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{progress.toFixed(0)}% paid</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
          {invoice.status === 'draft' && (
            <button onClick={handleGenerateLink} className="btn-primary flex items-center gap-2">
              <Send className="w-4 h-4" /> Generate & Send
            </button>
          )}
          {invoice.paymentLink && (
            <>
              <button onClick={copyLink} className="btn-secondary flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copy Payment Link
              </button>
              <a href={invoice.paymentLink} target="_blank" rel="noopener" className="btn-secondary">
                Open Payment Page
              </a>
            </>
          )}
          {invoice.status !== 'paid' && (
            <>
              <button onClick={handleFollowUp} className="btn-secondary">Send Reminder</button>
              <button onClick={handleMarkPaid} className="btn-primary flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Mark as Paid
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Line Items</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Description</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Qty</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Price</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item: any) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2 text-sm">{item.description}</td>
                <td className="py-2 text-sm text-right">{item.quantity}</td>
                <td className="py-2 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2 text-sm text-right font-medium">
                  {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoice.events && invoice.events.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
          <div className="space-y-3">
            {invoice.events.map((event: any) => (
              <div key={event.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 bg-brand-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-gray-700 font-medium">{event.eventType.replace('_', ' ')}</p>
                  <p className="text-gray-400 text-xs">{formatDateTime(event.eventAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
