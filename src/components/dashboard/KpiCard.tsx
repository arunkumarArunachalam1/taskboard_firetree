import React, { type ReactNode } from 'react';

export interface KpiCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  accentColor: string;
  valueColor?: string;
  index?: number;
  onClick?: () => void;
  isActive?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title, value, icon, accentColor, valueColor = '#111827', onClick, isActive
}) => (
  <div 
    className={`kpi-card ${isActive ? 'kpi-card-active' : ''} ${onClick ? 'kpi-card-clickable' : ''}`}
    onClick={onClick}
    style={{ '--accent': accentColor, '--value-color': valueColor } as React.CSSProperties}
  >
    {isActive && (
      <div className="kpi-active-badge">
        <span className="kpi-active-dot" />
        Active
      </div>
    )}
    <span className="kpi-icon">{icon}</span>
    <p className={`kpi-label ${isActive ? 'kpi-label-active' : ''}`}>{title}</p>
    <p className="kpi-value">
      {value.toLocaleString()}
    </p>
  </div>
);

export default KpiCard;
