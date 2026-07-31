import { useEffect, useState } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

export default function PayrollPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [staffForm, setStaffForm] = useState({ fullName: '', salaryAmount: 0, pensionRate: 8 });
  const [periodForm, setPeriodForm] = useState({ periodStart: '', periodEnd: '' });

  useEffect(() => {
    Promise.all([api.getStaff(), api.getPayrollPeriods()])
      .then(([s, p]) => { setStaffList(s); setPeriods(p); })
      .finally(() => setLoading(false));
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addStaff(staffForm);
    setShowAddStaff(false);
    setStaffForm({ fullName: '', salaryAmount: 0, pensionRate: 8 });
    api.getStaff().then(setStaffList);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.generatePayroll(periodForm);
    setShowGenerate(false);
    setPeriodForm({ periodStart: '', periodEnd: '' });
    api.getPayrollPeriods().then(setPeriods);
  };

  const handleMarkPaid = async (periodId: string) => {
    await api.markPayrollPaid(periodId);
    api.getPayrollPeriods().then(setPeriods);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-500 mt-1">{staffList.length} staff members</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddStaff(true)} className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
          <button onClick={() => setShowGenerate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Generate Payroll
          </button>
        </div>
      </div>

      {showAddStaff && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Add Staff Member</h3>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input type="text" value={staffForm.fullName} onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Monthly Salary (₦)</label>
                <input type="number" value={staffForm.salaryAmount || ''} onChange={(e) => setStaffForm({ ...staffForm, salaryAmount: Number(e.target.value) })} className="input" required />
              </div>
              <div>
                <label className="label">Pension Rate (%)</label>
                <input type="number" value={staffForm.pensionRate} onChange={(e) => setStaffForm({ ...staffForm, pensionRate: Number(e.target.value) })} className="input" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Add Staff</button>
              <button type="button" onClick={() => setShowAddStaff(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showGenerate && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Generate Payroll</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Period Start</label>
                <input type="date" value={periodForm.periodStart} onChange={(e) => setPeriodForm({ ...periodForm, periodStart: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Period End</label>
                <input type="date" value={periodForm.periodEnd} onChange={(e) => setPeriodForm({ ...periodForm, periodEnd: e.target.value })} className="input" required />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Generate</button>
              <button type="button" onClick={() => setShowGenerate(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Staff List</h3>
        {staffList.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No staff members yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Name</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Salary</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Pension</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s: any) => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-3 font-medium">{s.fullName}</td>
                  <td className="py-3 text-right">{formatCurrency(s.salaryAmount)}</td>
                  <td className="py-3 text-right">{s.pensionRate}%</td>
                  <td className="py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Payroll History</h3>
        {periods.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No payroll periods yet</p>
        ) : (
          <div className="space-y-4">
            {periods.map((period: any) => {
              const totalPaid = period.entries?.reduce((sum: number, e: any) => sum + Number(e.netPay), 0) || 0;
              return (
                <div key={period.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
                    </p>
                    <p className="text-sm text-gray-500">{period.entries?.length || 0} staff · Total: {formatCurrency(totalPaid)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(period.status)}`}>
                      {period.status}
                    </span>
                    {period.status === 'draft' && (
                      <button onClick={() => handleMarkPaid(period.id)} className="btn-primary text-sm flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
