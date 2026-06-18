import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import type { TrendPoint } from '../../types/dashboard.types';

interface Props { data: TrendPoint[] }

const CompletionTrendChart: React.FC<Props> = ({ data }) => (
  <ResponsiveContainer width="100%" height={160}>
    <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
      <XAxis
        dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }}
        axisLine={false} tickLine={false}
        interval={Math.floor(data.length / 5)}
      />
      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
      <Tooltip
        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
        formatter={(v: any) => [v, 'Cumulative']}
      />
      <Line
        type="monotone" dataKey="cumulative" stroke="#22C55E" strokeWidth={2}
        dot={{ r: 3, fill: '#22C55E', strokeWidth: 0 }}
        activeDot={{ r: 5, fill: '#22C55E' }}
      />
    </LineChart>
  </ResponsiveContainer>
);

export default CompletionTrendChart;
