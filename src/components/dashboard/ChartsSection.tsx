import React from 'react';
import { BarChart3, LineChart, TrendingUp, PieChart } from 'lucide-react';
import type { DashboardCharts } from '../../types/dashboard.types';

import DailyCompletion7DaysChart from '../charts/DailyCompletion7DaysChart';
import DailyCompletion30DaysChart from '../charts/DailyCompletion30DaysChart';
import CompletionTrendChart from '../charts/CompletionTrendChart';
import TaskStatusChart from '../charts/TaskStatusChart';

const ChartSkeleton: React.FC = () => (
  <div className="chart-card">
    <div className="skeleton" style={{ height: 16, width: '55%', marginBottom: 20 }} />
    <div className="skeleton" style={{ height: 240 }} />
  </div>
);

interface ChartCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children }) => (
  <div className="chart-card">
    <p className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
      {icon && <span style={{ display: 'flex', alignItems: 'center', color: '#6B7280' }}>{icon}</span>}
      {title}
    </p>
    {children}
  </div>
);

interface ChartsSectionProps {
  data: DashboardCharts | null;
  loading: boolean;
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="charts-grid">
        {Array.from({ length: 4 }).map((_, i) => <ChartSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="charts-grid">
      <ChartCard title="Daily Completions — Last 7 Days" icon={<BarChart3 size={16} strokeWidth={2.5} />}>
        <DailyCompletion7DaysChart data={data.last7Days} />
      </ChartCard>
      <ChartCard title="Daily Completions — Last 30 Days" icon={<LineChart size={16} strokeWidth={2.5} />}>
        <DailyCompletion30DaysChart data={data.last30Days} />
      </ChartCard>
      <ChartCard title="Cumulative Completion Trend" icon={<TrendingUp size={16} strokeWidth={2.5} />}>
        <CompletionTrendChart data={data.trend} />
      </ChartCard>
      <ChartCard title="Task Status Distribution" icon={<PieChart size={16} strokeWidth={2.5} />}>
        <TaskStatusChart data={data.statusDistribution} />
      </ChartCard>
    </div>
  );
};

export default ChartsSection;
