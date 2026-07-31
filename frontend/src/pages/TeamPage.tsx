import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { api } from '../lib/api';
import { getInitials } from '../lib/utils';

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ phoneNumber: '', role: 'staff' });

  useEffect(() => {
    Promise.all([api.getTeamMembers(), api.getAuditLog()])
      .then(([m, a]) => { setMembers(m); setAuditLog(a.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.inviteMember(form);
    setShowInvite(false);
    setForm({ phoneNumber: '', role: 'staff' });
    api.getTeamMembers().then(setMembers);
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm('Revoke this member?')) return;
    await api.revokeMember(userId);
    api.getTeamMembers().then(setMembers);
  };

  const roleLabels: Record<string, string> = {
    owner: 'Owner - Full access',
    accountant: 'Accountant - Can log entries, view ledger & invoices',
    staff: 'Staff - Can log entries only',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team & Roles</h1>
          <p className="text-gray-500 mt-1">{members.length} members</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {showInvite && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Invite Team Member</h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone Number</label>
                <input type="tel" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="input" required placeholder="+234..." />
              </div>
              <div>
                <label className="label">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                  <option value="staff">Staff</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
              <Shield className="w-4 h-4 inline mr-1" />
              {roleLabels[form.role]}
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Send Invite</button>
              <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Members</h3>
        <div className="space-y-3">
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                  <span className="text-brand-700 font-medium text-sm">
                    {getInitials(m.user.fullName || m.user.phoneNumber)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{m.user.fullName || m.user.phoneNumber}</p>
                  <p className="text-sm text-gray-500">{m.user.phoneNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                  m.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                  m.role === 'accountant' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {m.role}
                </span>
                {m.role !== 'owner' && (
                  <button onClick={() => handleRevoke(m.user.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Audit Log</h3>
        {auditLog.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No activity yet</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {auditLog.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 text-sm p-2">
                <div className="w-2 h-2 bg-brand-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-gray-700">
                    <span className="font-medium">{log.user?.fullName || 'System'}</span>
                    {' '}{log.changeType}{' '}
                    {log.transaction && (
                      <span className="text-gray-500">
                        transaction of ₦{Number(log.transaction.amount).toLocaleString()}
                        {log.transaction.counterpartyName && ` with ${log.transaction.counterpartyName}`}
                      </span>
                    )}
                  </p>
                  <p className="text-gray-400 text-xs">{new Date(log.changedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
