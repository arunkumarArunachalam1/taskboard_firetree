import React from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { TrendPoint } from '../../types/dashboard.types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props { data: TrendPoint[] }

const CompletionTrendChart: React.FC<Props> = ({ data }) => {
  const chartData = React.useMemo(() => ({
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Cumulative Completions',
        data: data.map(d => d.cumulative),
        borderColor: '#22C55E',
        backgroundColor: '#22C55E',
        borderWidth: 2,
        stepped: 'before' as const,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  }), [data]);

  const options = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#374151',
        bodyColor: '#374151',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        displayColors: false,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: '#9CA3AF', maxTicksLimit: 6 },
        border: { display: false }
      },
      y: {
        grid: { color: '#F3F4F6', drawBorder: false },
        ticks: { font: { size: 10 }, color: '#9CA3AF' },
        border: { display: false }
      }
    }
  }), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: 160 }}>
      <Line data={chartData} options={options as any} />
    </div>
  );
};

export default CompletionTrendChart;
