'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  date: string;
  earnings: number;
  count: number;
}

interface DashboardChartProps {
  data: ChartData[];
}

export default function DashboardChart({ data }: DashboardChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted">
        Bu ay için henüz onaylanmış işlem bulunmuyor.
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#718096', fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fill: '#718096', fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value) => [
              `$${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
              'Kazanç',
            ]}
          />
          <Line
            type="monotone"
            dataKey="earnings"
            stroke="#1e3a5f"
            strokeWidth={2}
            dot={{ fill: '#1e3a5f', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#3182ce' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
