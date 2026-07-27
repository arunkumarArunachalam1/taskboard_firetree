import React from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { DailyCompletionPoint } from '../../types/dashboard.types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props { data: DailyCompletionPoint[], chartRef?: React.Ref<any> }

const DailyCompletion30DaysChart: React.FC<Props> = ({ data, chartRef }) => {
  const chartData = React.useMemo(() => ({
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Completed',
        data: data.map(d => d.completed),
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F6',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  }), [data]);

  const options = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
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
        min: 0,
        suggestedMax: 5,
        grid: { color: '#F3F4F6', drawBorder: false },
        ticks: { font: { size: 10 }, color: '#9CA3AF', precision: 0 },
        border: { display: false }
      }
    }
  }), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: 160 }}>
      <Line ref={chartRef} data={chartData} options={options as any} />
    </div>
  );
};

export default DailyCompletion30DaysChart;
