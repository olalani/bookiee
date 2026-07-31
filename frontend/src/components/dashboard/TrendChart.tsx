import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../lib/utils';

interface TrendChartProps {
  data: Array<{ month: string; income: number; expense: number }>;
}

export default function TrendChart({ data }: TrendChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.month + '-01').toLocaleDateString('en-NG', { month: 'short' }),
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Income"
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Expenses"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
