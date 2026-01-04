'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  name: string;
  earnings: number;
}

interface AdminChartProps {
  data: ChartData[];
}

export default function AdminChart({ data }: AdminChartProps) {
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
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            tick={{ fill: '#718096', fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(value) => `$${value}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#718096', fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
            width={100}
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
          <Bar
            dataKey="earnings"
            fill="#1e3a5f"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
