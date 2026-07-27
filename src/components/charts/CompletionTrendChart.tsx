import React from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { TrendPoint } from '../../types/dashboard.types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props { data: TrendPoint[], chartRef?: React.Ref<any> }

const CompletionTrendChart: React.FC<Props> = ({ data, chartRef }) => {
  const chartData = React.useMemo(() => {
    let finalLabels: string[] = [];
    let finalData: number[] = [];

    if (!data || data.length === 0) {
      const today = new Date();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        finalLabels.push(monthNames[d.getMonth()]);
        finalData.push(0);
      }
    } else {
      finalLabels = data.map(d => d.date);
      finalData = data.map(d => d.cumulative);
    }

    return {
      labels: finalLabels,
      datasets: [
        {
          label: 'Cumulative Completions',
          data: finalData,
          borderColor: '#22C55E',
          backgroundColor: '#22C55E',
          borderWidth: 2,
          stepped: 'before' as const,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [data]);

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
        ticks: { font: { size: 10 }, color: '#9CA3AF', maxTicksLimit: (!data || data.length === 0) ? 3 : 6 },
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

export default CompletionTrendChart;
