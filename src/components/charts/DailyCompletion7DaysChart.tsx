import React from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { DailyCompletionPoint } from '../../types/dashboard.types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type ExportableChart = ChartJS & { _exportingPdf?: boolean };

interface Props { data: DailyCompletionPoint[], chartRef?: React.Ref<any> }

const DailyCompletion7DaysChart: React.FC<Props> = ({ data, chartRef }) => {
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
        ticks: { font: { size: 10 }, color: '#9CA3AF' },
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

  const valueLabelsPlugin = React.useMemo(() => ({
    id: 'valueLabelsPlugin',
    afterDatasetsDraw(chart: ExportableChart) {
      if (!chart._exportingPdf) return;
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset: { data: unknown[] }, i: number) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach((element: { x: number; y: number }, index: number) => {
          const val = dataset.data[index];
          if (val === null || val === undefined || Number(val) === 0) return;
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
  }), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: 160 }}>
      <Bar ref={chartRef} data={chartData} options={options as any} plugins={[valueLabelsPlugin]} />
    </div>
  );
};

export default DailyCompletion7DaysChart;
