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
    className={`kpi-card ${isActive ? 'kpi-card-active' : ''}`}
    onClick={onClick}
    style={{ 
      borderTop: `3px solid ${accentColor}`,
      borderLeft: isActive ? `1px solid ${accentColor}` : '1px solid var(--border)',
      borderRight: isActive ? `1px solid ${accentColor}` : '1px solid var(--border)',
      borderBottom: isActive ? `1px solid ${accentColor}` : '1px solid var(--border)',
      backgroundColor: 'var(--card)',
      cursor: onClick ? 'pointer' : 'default',
      boxShadow: isActive ? `0 4px 14px ${accentColor}20` : undefined,
      transform: isActive ? 'translateY(-2px)' : undefined,
      transition: 'all 0.2s ease-in-out',
      position: 'relative'
    }}
  >
    {isActive && (
      <div style={{
        position: 'absolute',
        top: 10,
        right: 12,
        background: `${accentColor}18`,
        color: accentColor,
        border: `1px solid ${accentColor}35`,
        fontSize: '10px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}>
        <span style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: accentColor,
          display: 'inline-block'
        }} />
        Active
      </div>
    )}
    <span className="kpi-icon">{icon}</span>
    <p className="kpi-label" style={{ fontWeight: isActive ? 600 : 500 }}>{title}</p>
    <p className="kpi-value" style={{ color: valueColor }}>
      {value.toLocaleString()}
    </p>
  </div>
);

export default KpiCard;
