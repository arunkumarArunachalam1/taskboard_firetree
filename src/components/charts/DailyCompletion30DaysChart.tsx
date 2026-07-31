import React from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { DailyCompletionPoint } from '../../types/dashboard.types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type ExportableChart = ChartJS & { _exportingPdf?: boolean };

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
        suggestedMax: Math.max(5, ...data.map(d => d.completed)) * 1.18,
        grid: { color: '#F3F4F6', drawBorder: false },
        ticks: { font: { size: 10 }, color: '#9CA3AF', precision: 0 },
        border: { display: false }
      }
    }
  }), [data]);

  const significantPointsPlugin = React.useMemo(() => ({
    id: 'significantPointsPlugin',
    afterDatasetsDraw(chart: ExportableChart) {
      if (!chart._exportingPdf) return;
      const { ctx } = chart;
      const maxVal = Math.max(0, ...data.map(d => d.completed));
      chart.data.datasets.forEach((dataset: { data: unknown[] }, i: number) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach((element: { x: number; y: number }, index: number) => {
          const val = dataset.data[index];
          if (val === null || val === undefined || Number(val) === 0) return;
          const isLatest = index === data.length - 1;
          const isSignificantPeak = Number(val) >= Math.max(10, maxVal * 0.25);
          if (!isLatest && !isSignificantPeak) return;
          ctx.save();
          ctx.font = 'bold 10px Helvetica, Arial, sans-serif';
          ctx.fillStyle = '#374151';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          const formatted = Number(val).toLocaleString();
          ctx.fillText(formatted, element.x, element.y - 4);
          ctx.restore();
        });
      });
    },
  }), [data]);

  return (
    <div style={{ position: 'relative', width: '100%', height: 160 }}>
      <Line ref={chartRef} data={chartData} options={options as any} plugins={[significantPointsPlugin]} />
    </div>
  );
};

export default DailyCompletion30DaysChart;
