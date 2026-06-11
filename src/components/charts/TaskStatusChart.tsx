import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { StatusDistribution } from '../../types/dashboard.types';

interface Props { data: StatusDistribution[] }

// Matching screenshot: Pending (yellow), In Review (blue), Overdue (red), Completed (green)
const COLORS = ['#F59E0B', '#3B82F6', '#EF4444', '#22C55E'];
const LABELS = ['Pending 21%', 'In Review 13%', 'Overdue 56%', 'Completed 16%'];

const TaskStatusChart: React.FC<Props> = ({ data }) => (
  <ResponsiveContainer width="100%" height={160}>
    <PieChart>
      <Pie
        data={data}
        cx="50%" cy="50%"
        innerRadius={38} outerRadius={60}
        dataKey="value"
        paddingAngle={2}
        startAngle={90} endAngle={-270}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
        formatter={(v: number, _name: string, props: { payload?: { name: string } }) => [v, props?.payload?.name ?? '']}
      />
      <Legend
        iconType="circle"
        iconSize={8}
        wrapperStyle={{ fontSize: 10, lineHeight: '20px' }}
        formatter={(_value, _entry, index) => (
          <span style={{ color: '#374151', fontSize: 10 }}>{LABELS[index]}</span>
        )}
      />
    </PieChart>
  </ResponsiveContainer>
);

export default TaskStatusChart;
