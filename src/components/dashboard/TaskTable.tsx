import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle2, Activity } from 'lucide-react';
import type { TaskListResponse, Task } from '../../types/dashboard.types';

// ── Helpers ──────────────────────────────────────────────────────────────

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return '??';
};

const getAvatarColor = (name: string) => {
  const colors = ['#22C55E', '#8B5CF6', '#3B82F6', '#F59E0B', '#EC4899', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const StatusBadge: React.FC<{ status: Task['Status'] }> = ({ status }) => {
  const config: Record<Task['Status'], { label: string; color: string; Icon: React.FC<any> }> = {
    Late: { label: 'Overdue', color: '#DC2626', Icon: AlertCircle },
    Pending: { label: 'Pending', color: '#D97706', Icon: Clock },
    Completed: { label: 'Completed', color: '#16A34A', Icon: CheckCircle2 },
    Active: { label: 'Active', color: '#2563EB', Icon: Activity },
  };
  const { label, color, Icon } = config[status] ?? config.Active;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 600, color,
      whiteSpace: 'nowrap',
    }}>
      <Icon size={10} strokeWidth={2.5} />
      {label}
    </span>
  );
};

// ── Skeleton ─────────────────────────────────────────────────────────────

const TableSkeleton: React.FC = () => (
  <div className="table-card">
    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
      <div className="skeleton" style={{ height: 32, width: 220, borderRadius: 6 }} />
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 16, alignItems: 'center' }}>
        <div className="skeleton" style={{ height: 14, width: '20%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '15%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '15%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '10%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: '10%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 22, width: 70, borderRadius: 20 }} />
      </div>
    ))}
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────

interface TaskTableProps {
  data: TaskListResponse | null;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  search: string;
  onSearchChange: (s: string) => void;
  sortColumn?: number;
  sortDir: 'asc' | 'desc';
  onSortChange: (col: number, dir: 'asc' | 'desc') => void;
}

// ── Component ─────────────────────────────────────────────────────────────

const TaskTable: React.FC<TaskTableProps> = ({ 
  data, loading, page, onPageChange, 
  search, onSearchChange, 
  sortColumn, sortDir, onSortChange 
}) => {
  if (loading || !data) return <TableSkeleton />;

  const totalPages = Math.ceil(data.total / data.pageSize);
  const filtered = data.tasks;

  const handleSort = (colIndex: number) => {
    const isAsc = sortColumn === colIndex && sortDir === 'asc';
    onSortChange(colIndex, isAsc ? 'desc' : 'asc');
  };

  // Smart pagination: show up to 7 pages with ellipsis
  const getPageNumbers = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page - 1, page, page + 1, '…', totalPages];
  };

  return (
    <div className="table-card">
      {/* Header bar */}
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Tasks</span>
          <span style={{
            background: 'var(--green)', color: '#fff', borderRadius: 20,
            fontSize: 11, fontWeight: 700, padding: '2px 8px'
          }}>{data.total}</span>
        </div>
        <div>
          <input
            type="text"
            placeholder="Search tasks, clients, assignees (Press Enter)…"
            defaultValue={search}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onSearchChange(e.currentTarget.value);
              }
            }}
            style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 12,
              border: '1px solid #D1D5DB', outline: 'none',
              background: '#fff', color: 'var(--text)', width: 240,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="task-table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(0)}>
                Task Name {sortColumn === 0 && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(1)}>
                Description {sortColumn === 1 && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }} onClick={() => handleSort(2)}>
                Created By {sortColumn === 2 && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }} onClick={() => handleSort(3)}>
                Client {sortColumn === 3 && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(4)}>
                Exp Start {sortColumn === 4 && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(5)}>
                Due {sortColumn === 5 && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(6)}>
                Assigned To {sortColumn === 6 && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }} onClick={() => handleSort(7)}>
                Facility {sortColumn === 7 && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ userSelect: 'none', textAlign: 'center' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-text)', fontSize: 13 }}>
                  No tasks match your search.
                </td>
              </tr>
            ) : (
              filtered.map(task => (
                <tr key={task.TaskID} className={task.Status === 'Late' ? 'row-late' : ''}>
                  <td>
                    <div dangerouslySetInnerHTML={{ __html: task.TaskName }} />
                  </td>
                  <td>
                    <div dangerouslySetInnerHTML={{ __html: task.TaskDescription }} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span dangerouslySetInnerHTML={{ __html: task.CreatedBy }} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div dangerouslySetInnerHTML={{ __html: task.ClientName }} className="client-name-wrapper" />
                  </td>
                  <td>
                    <span>{task.ExpectedStartDate}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: task.Status === 'Late' ? 700 : 'normal' }}>
                      {task.ExpectedDueDate}
                    </span>
                  </td>
                  <td>
                    <span>{task.AssignedTo}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span>{task.Facility}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input type="radio" className="action-radio" name="selectedTask" value={task.TaskID} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <span className="page-info">
          Showing <strong>{Math.min((page - 1) * data.pageSize + 1, data.total)}</strong>–<strong>{Math.min(page * data.pageSize, data.total)}</strong> of <strong>{data.total}</strong>
        </span>
        <div className="page-btns">
          <button className="page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="Previous">
            <ChevronLeft size={14} />
          </button>
          {getPageNumbers().map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--gray-text)', fontSize: 13 }}>…</span>
            ) : (
              <button
                key={p}
                className={`page-btn ${page === p ? 'active' : ''}`}
                onClick={() => onPageChange(p as number)}
              >
                {p}
              </button>
            )
          )}
          <button className="page-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} title="Next">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskTable;
