import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import type { DailyCompletionPoint } from '../../types/dashboard.types';

interface Props { data: DailyCompletionPoint[] }

const DailyCompletion7DaysChart: React.FC<Props> = ({ data }) => (
  <div style={{ width: '100%', height: 120, minHeight: 120 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }}
          axisLine={false} tickLine={false}
        />
        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
          cursor={{ fill: '#F3F4F6' }}
        />
        <Bar dataKey="completed" name="Completed" fill="#6366F1" radius={[3, 3, 0, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default DailyCompletion7DaysChart;
