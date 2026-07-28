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
  chart7Ref?: React.Ref<any>;
  chart30Ref?: React.Ref<any>;
  chart90Ref?: React.Ref<any>;
  chartPieRef?: React.Ref<any>;
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ data, loading, chart7Ref, chart30Ref, chart90Ref, chartPieRef }) => {
  if (loading || !data) {
    return (
      <div className="charts-grid">
        {Array.from({ length: 4 }).map((_, i) => <ChartSkeleton key={i} />)}
      </div>
    );
  }

  const hasData = 
    data.last7Days.some(d => d.completed > 0 || d.created > 0) ||
    data.last30Days.some(d => d.completed > 0 || d.created > 0) ||
    data.trend.some(d => d.cumulative > 0) ||
    data.statusDistribution.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="charts-empty-state">
        <div className="charts-empty-icon-container">
          <BarChart3 size={24} className="charts-empty-icon" />
        </div>
        <h3 className="charts-empty-title">No Data Available</h3>
        <p className="charts-empty-text">
          There is no chart data available for the current filters. Please adjust your filters or select a different facility to view insights.
        </p>
      </div>
    );
  }

  return (
    <div className="charts-grid">
      <ChartCard title="Daily Completions — Last 7 Days" icon={<BarChart3 size={16} strokeWidth={2.5} />}>
        <DailyCompletion7DaysChart data={data.last7Days} chartRef={chart7Ref} />
      </ChartCard>
      <ChartCard title="Daily Completions — Last 30 Days" icon={<LineChart size={16} strokeWidth={2.5} />}>
        <DailyCompletion30DaysChart data={data.last30Days} chartRef={chart30Ref} />
      </ChartCard>
      <ChartCard title="Cumulative Completion Trend - 90 Days" icon={<TrendingUp size={16} strokeWidth={2.5} />}>
        <CompletionTrendChart data={data.trend} chartRef={chart90Ref} />
      </ChartCard>
      <ChartCard title="Task Status Distribution" icon={<PieChart size={16} strokeWidth={2.5} />}>
        <TaskStatusChart data={data.statusDistribution} chartRef={chartPieRef} />
      </ChartCard>
    </div>
  );
};

export default ChartsSection;
