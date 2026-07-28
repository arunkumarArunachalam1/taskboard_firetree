import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { StatusDistribution } from '../../types/dashboard.types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props { data: StatusDistribution[], chartRef?: React.Ref<any> }

const FALLBACK_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

const TaskStatusChart: React.FC<Props> = ({ data, chartRef }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const chartData = React.useMemo(() => ({
    labels: data.map(d => {
      let pctStr = '';
      if (d.percentage !== undefined) {
        // If the API provides a percentage (e.g. 0.01 or 81.68), use it directly but format it nicely
        pctStr = Number(d.percentage) % 1 === 0
          ? Math.round(d.percentage).toString()
          : Number(d.percentage).toString();
      } else {
        pctStr = total > 0 ? Math.round((d.value / total) * 100).toString() : '0';
      }
      return `${d.name} ${pctStr}%`;
    }),
    datasets: [
      {
        data: data.map(d => d.value),
        backgroundColor: data.map((d, i) => {
          if (d.color) return d.color;
          switch (d.name) {
            case 'Completed': return '#10B981';     // Green
            case 'Due in Future': return '#3B82F6'; // Blue
            case 'Overdue': return '#EF4444';       // Red
            case 'Due Today': return '#F59E0B';     // Orange
            default: return FALLBACK_COLORS[i % FALLBACK_COLORS.length];
          }
        }),
        borderWidth: 0,
      },
    ],
  }), [data, total]);

  const options = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        onClick: (e: any) => e.native.stopPropagation(), // Disable default toggle behavior
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          boxHeight: 6,
          font: { size: 9 },
          color: '#374151',
          padding: 8,
          generateLabels: (chart: any) => {
            const chartData = chart.data;
            if (!chartData.labels.length || !chartData.datasets.length) return [];
            return chartData.labels.map((label: string, i: number) => {
              const meta = chart.getDatasetMeta(0);
              const style = meta.controller.getStyle(i, false);
              const d = data[i];
              let textText = label;
              if (chart._exportingPdf && d) {
                const formattedCount = Number(d.value || 0).toLocaleString();
                let pctStr = '';
                if (d.percentage !== undefined) {
                  pctStr = Number(d.percentage) % 1 === 0 ? Math.round(d.percentage).toString() : Number(d.percentage).toString();
                } else {
                  pctStr = total > 0 ? Math.round((d.value / total) * 100).toString() : '0';
                }
                textText = `${d.name}: ${formattedCount} (${pctStr}%)`;
              }
              return {
                text: textText,
                fillStyle: style.backgroundColor,
                strokeStyle: style.borderColor,
                lineWidth: style.borderWidth,
                hidden: !chart.getDataVisibility(i),
                index: i
              };
            });
          }
        }
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#374151',
        bodyColor: '#374151',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        displayColors: false,
        callbacks: {
          label: function (context: any) {
            return ` ${context.raw}`;
          }
        }
      }
    }
  }), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: 160 }}>
      <Doughnut ref={chartRef} data={chartData} options={options as any} />
    </div>
  );
};

export default TaskStatusChart;
