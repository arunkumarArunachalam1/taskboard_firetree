import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { StatusDistribution } from '../../types/dashboard.types';

ChartJS.register(ArcElement, Tooltip, Legend);

type ExportableChart = ChartJS & { _exportingPdf?: boolean };

interface Props { data: StatusDistribution[], chartRef?: React.Ref<any> }

const FALLBACK_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

const formatPercentage = (val: number, total: number, pct?: number | string): string => {
  if (!val || val <= 0) return '0%';
  const actualPct = total > 0 ? (val / total) * 100 : 0;
  if (actualPct > 0 && actualPct < 0.01) {
    return '<0.01%';
  }
  const numPct = pct !== undefined ? Number(pct) : actualPct;
  if (numPct > 0 && numPct < 0.01) {
    return '<0.01%';
  }
  const pctStr = numPct % 1 === 0
    ? Math.round(numPct).toString()
    : Number(numPct.toFixed(2)).toString();
  return `${pctStr}%`;
};

const TaskStatusChart: React.FC<Props> = ({ data, chartRef }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const chartData = React.useMemo(() => ({
    labels: data.map(d => {
      const pctFormatted = formatPercentage(d.value, total, d.percentage);
      return `${d.name} ${pctFormatted}`;
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
        onClick: (e: { native: Event }) => e.native.stopPropagation(), // Disable default toggle behavior
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          boxHeight: 6,
          font: { size: 9 },
          color: '#374151',
          padding: 8,
          generateLabels: (chart: ExportableChart) => {
            const labels = chart.data.labels || [];
            if (!labels.length || !chart.data.datasets.length) return [];
            return labels.map((label: unknown, i: number) => {
              const meta = chart.getDatasetMeta(0);
              const style = meta.controller.getStyle(i, false);
              const d = data[i];
              let textText = String(label);
              if (chart._exportingPdf && d) {
                const formattedCount = Number(d.value || 0).toLocaleString();
                const pctFormatted = formatPercentage(d.value, total, d.percentage);
                textText = `${d.name}: ${formattedCount} (${pctFormatted})`;
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
          label: function (context: { raw: unknown }) {
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
