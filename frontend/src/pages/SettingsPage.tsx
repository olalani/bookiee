import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function SettingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', businessType: '', autoConfirmThreshold: 100000 });

  useEffect(() => {
    api.getBusiness().then((b) => {
      setBusiness(b);
      setForm({
        name: b.name,
        businessType: b.businessType || 'sme',
        autoConfirmThreshold: Number(b.autoConfirmThreshold),
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateBusiness(form);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your business settings</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Business Profile</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Business Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Business Type</label>
            <select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} className="input">
              <option value="sme">Small/Medium Business</option>
              <option value="freelancer">Freelancer</option>
              <option value="corporate">Corporate</option>
            </select>
          </div>
          <div>
            <label className="label">Auto-Confirm Threshold (₦)</label>
            <input type="number" value={form.autoConfirmThreshold} onChange={(e) => setForm({ ...form, autoConfirmThreshold: Number(e.target.value) })} className="input" />
            <p className="text-xs text-gray-400 mt-1">Transactions above this amount require manual confirmation</p>
          </div>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">WhatsApp Integration</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            Send a WhatsApp message to <span className="font-mono font-medium">+234 XXX XXX XXXX</span> to link your account.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Your linked number: {business?.whatsappPhoneNumberId || 'Not linked yet'}
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Data & Privacy</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p>Voice notes are automatically deleted after 30 days per NDPR compliance.</p>
          <p>All data is encrypted at rest and in transit.</p>
        </div>
      </div>
    </div>
  );
}
