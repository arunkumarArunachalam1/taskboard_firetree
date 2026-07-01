import React from 'react';
import KpiCard from './KpiCard';
import type { DashboardSummary } from '../../types/dashboard.types';

const SkeletonCard: React.FC = () => (
  <div className="kpi-card" style={{ borderTopColor: '#E5E7EB' }}>
    <div className="skeleton" style={{ width: 24, height: 24, marginBottom: 10 }} />
    <div className="skeleton" style={{ height: 11, width: '70%', marginBottom: 8 }} />
    <div className="skeleton" style={{ height: 36, width: '45%' }} />
  </div>
);

import { AlarmClock, CircleAlert, FileEdit, CheckCircle2, ClipboardList } from 'lucide-react';

const IconWrapper: React.FC<{ icon: React.ReactNode; color: string; bg: string }> = ({ icon, color, bg }) => (
  <div style={{
    width: 32, height: 32, borderRadius: 8,
    background: bg, color: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, boxShadow: `0 2px 8px ${color}20`
  }}>
    {icon}
  </div>
);

interface KpiGridProps {
  data: DashboardSummary | null;
  loading: boolean;
}

const KpiGrid: React.FC<KpiGridProps> = ({ data, loading }) => (
  <div className="kpi-grid">
    {loading || !data ? (
      Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
    ) : (
      <>
        <KpiCard title="Due Today" value={data.dueToday || 0} icon={<IconWrapper icon={<AlarmClock size={18} strokeWidth={2.5} />} color="#F59E0B" bg="#FEF3C7" />} accentColor="#F59E0B" valueColor="#111827" />
        <KpiCard title="Overdue" value={data.overdue || 0} icon={<IconWrapper icon={<CircleAlert size={18} strokeWidth={2.5} />} color="#EF4444" bg="#FEE2E2" />} accentColor="#EF4444" valueColor="#EF4444" />
        <KpiCard title="Due in Future" value={data.pending || 0} icon={<IconWrapper icon={<FileEdit size={18} strokeWidth={2.5} />} color="#991B1B" bg="#FEE2E2" />} accentColor="#991B1B" valueColor="#991B1B" />
        <KpiCard title="Completed" value={data.completed || 0} icon={<IconWrapper icon={<CheckCircle2 size={18} strokeWidth={2.5} />} color="#22C55E" bg="#DCFCE7" />} accentColor="#22C55E" valueColor="#22C55E" />
        <KpiCard title="Total Assigned" value={data.totalAssigned || 0} icon={<IconWrapper icon={<ClipboardList size={18} strokeWidth={2.5} />} color="#6B7280" bg="#F3F4F6" />} accentColor="#9CA3AF" valueColor="#111827" />
      </>
    )}
  </div>
);

export default KpiGrid;
