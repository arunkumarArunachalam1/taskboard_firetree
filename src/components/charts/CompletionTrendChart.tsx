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
        suggestedMax: Math.max(5, ...data.map(d => d.cumulative)) * 1.18,
        grid: { color: '#F3F4F6', drawBorder: false },
        ticks: { font: { size: 10 }, color: '#9CA3AF', precision: 0 },
        border: { display: false }
      }
    }
  }), [data]);

  const trendLabelsPlugin = React.useMemo(() => ({
    id: 'trendLabelsPlugin',
    afterDatasetsDraw(chart: any) {
      if (!chart._exportingPdf) return;
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset: any, i: number) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach((element: any, index: number) => {
          const val = dataset.data[index];
          if (val === null || val === undefined || Number(val) === 0) return;
          const prevVal = index > 0 ? Number(dataset.data[index - 1] || 0) : 0;
          const jump = Number(val) - prevVal;
          const isLatest = index === dataset.data.length - 1;
          const isMajorJump = jump >= 15 || (index === 0 && Number(val) > 0);
          if (!isLatest && !isMajorJump) return;
          ctx.save();
          ctx.font = 'bold 10px Helvetica, Arial, sans-serif';
          ctx.fillStyle = '#166534';
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
      <Line ref={chartRef} data={chartData} options={options as any} plugins={[trendLabelsPlugin]} />
    </div>
  );
};

export default CompletionTrendChart;
