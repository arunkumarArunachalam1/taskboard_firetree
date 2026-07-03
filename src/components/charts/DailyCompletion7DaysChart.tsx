import React from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { DailyCompletionPoint } from '../../types/dashboard.types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props { data: DailyCompletionPoint[] }

const DailyCompletion7DaysChart: React.FC<Props> = ({ data }) => {
  const chartData = React.useMemo(() => ({
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Completed',
        data: data.map(d => d.completed),
        backgroundColor: '#6366F1',
        borderRadius: 3,
        barThickness: 18,
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
        ticks: { font: { size: 10 }, color: '#9CA3AF' },
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
      <Bar data={chartData} options={options as any} />
    </div>
  );
};

export default DailyCompletion7DaysChart;
