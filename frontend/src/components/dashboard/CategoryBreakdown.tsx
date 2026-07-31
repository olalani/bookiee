import { formatCurrency } from '../../lib/utils';

interface CategoryBreakdownProps {
  data: Array<{ category: string; income: number; expense: number; count: number }>;
}

export default function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">No data yet</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const total = item.income + item.expense;
        const maxTotal = Math.max(...data.map((d) => d.income + d.expense));
        const width = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

        return (
          <div key={item.category}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{item.category}</span>
              <span className="text-gray-500">{item.count} txns</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all"
                style={{ width: `${width}%` }}
              ></div>
            </div>
            <div className="flex gap-4 text-xs text-gray-400 mt-1">
              {item.income > 0 && <span className="text-income">+{formatCurrency(item.income)}</span>}
              {item.expense > 0 && <span className="text-expense">-{formatCurrency(item.expense)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
