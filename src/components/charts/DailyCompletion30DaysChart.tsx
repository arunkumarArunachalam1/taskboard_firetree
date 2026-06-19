import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import type { DailyCompletionPoint } from '../../types/dashboard.types';

interface Props { data: DailyCompletionPoint[] }

const DailyCompletion30DaysChart: React.FC<Props> = ({ data }) => (
  <div style={{ width: '100%', height: 120, minHeight: 120 }}>
    <ResponsiveContainer width="100%" height="100%">
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
        />
        <Line
          type="monotone" dataKey="completed" name="Completed"
          stroke="#3B82F6" strokeWidth={1.5} dot={false}
          activeDot={{ r: 4, fill: '#3B82F6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default DailyCompletion30DaysChart;
