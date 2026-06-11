import React, { type ReactNode } from 'react';

export interface KpiCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  accentColor: string;
  valueColor?: string;
  index?: number;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title, value, icon, accentColor, valueColor = '#111827',
}) => (
  <div className="kpi-card" style={{ borderTopColor: accentColor }}>
    <span className="kpi-icon">{icon}</span>
    <p className="kpi-label">{title}</p>
    <p className="kpi-value" style={{ color: valueColor }}>
      {value.toLocaleString()}
    </p>
  </div>
);

export default KpiCard;
