import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle2, Activity, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskListResponse, Task } from '../../types/dashboard.types';
import { extractHrefFromHTML, extractTextFromHTML, markTasksCompleted } from '../../services/dashboard.service';

// ── Helpers ──────────────────────────────────────────────────────────────

export const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return '??';
};

export const getAvatarColor = (name: string) => {
  const colors = ['#22C55E', '#8B5CF6', '#3B82F6', '#F59E0B', '#EC4899', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export const StatusBadge: React.FC<{ status: Task['Status'] }> = ({ status }) => {
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
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    setSelectedIds([]);
  }, [data]);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
  };

  if (loading || !data) return <TableSkeleton />;

  const totalPages = Math.ceil(data.total / data.pageSize);
  const filtered = data.tasks;

  const handleRowClick = (task: Task, e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'A' || 
      target.tagName === 'INPUT' || 
      target.tagName === 'BUTTON' ||
      target.closest('a') || 
      target.closest('input') || 
      target.closest('button')
    ) {
      return;
    }

    const url = extractHrefFromHTML(task.TaskDescription);
    if (url) {
      window.location.href = url;
    } else {
      showToast(`No linked page for task: "${extractTextFromHTML(task.TaskName)}"`, 'info');
    }
  };

  const handleSelectRow = (taskId: number) => {
    setSelectedIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const isAllSelected = filtered.length > 0 && filtered.every(task => selectedIds.includes(task.TaskID));

  const handleSelectAll = () => {
    if (isAllSelected) {
      const pageTaskIds = filtered.map(t => t.TaskID);
      setSelectedIds(prev => prev.filter(id => !pageTaskIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const next = [...prev];
        filtered.forEach(task => {
          if (!next.includes(task.TaskID)) {
            next.push(task.TaskID);
          }
        });
        return next;
      });
    }
  };

  const handleMarkSelectedComplete = async () => {
    if (selectedIds.length === 0) return;

    const confirmMessage = selectedIds.length === 1
      ? 'Are you sure you want to mark the selected task complete?'
      : `Are you sure you want to mark the ${selectedIds.length} selected tasks complete?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await markTasksCompleted(selectedIds);
      if (response.isSuccess === 1) {
        showToast(response.successMessage || 'Tasks marked complete successfully!', 'success');
        setSelectedIds([]);
        onPageChange(page);
      } else {
        showToast(response.errorMessage || 'Failed to complete selected tasks.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'An error occurred while marking tasks complete.', 'error');
    }
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Tasks</span>
            <span style={{
              background: 'var(--green)', color: '#fff', borderRadius: 20,
              fontSize: 11, fontWeight: 700, padding: '2px 8px'
            }}>{data.total}</span>
          </div>

          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.02, backgroundColor: 'var(--green-dark)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMarkSelectedComplete}
                style={{
                  background: 'var(--green)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 10px rgba(34, 197, 94, 0.25)',
                  transition: 'background-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                }}
              >
                <CheckCircle2 size={14} strokeWidth={2.5} />
                Mark Complete ({selectedIds.length})
              </motion.button>
            )}
          </AnimatePresence>
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
              <th style={{ userSelect: 'none', textAlign: 'center', width: '60px' }}>
                <input 
                  type="checkbox" 
                  checked={isAllSelected} 
                  onChange={handleSelectAll} 
                  style={{ cursor: 'pointer', verticalAlign: 'middle' }}
                  title="Select All"
                />
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
                <tr 
                  key={task.TaskID} 
                  className={task.Status === 'Late' ? 'row-late' : ''}
                  onClick={(e) => handleRowClick(task, e)}
                >
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
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(task.TaskID)} 
                      onChange={() => handleSelectRow(task.TaskID)}
                      style={{ cursor: 'pointer' }}
                    />
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

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {toast && (() => {
            const colors = {
              info: { bg: '#EFF6FF', border: '#BFDBFE', leftBorder: '#3B82F6', text: '#1E40AF' },
              success: { bg: '#ECFDF5', border: '#A7F3D0', leftBorder: '#10B981', text: '#065F46' },
              error: { bg: '#FEF2F2', border: '#FCA5A5', leftBorder: '#EF4444', text: '#991B1B' }
            }[toast.type] || { bg: '#EFF6FF', border: '#BFDBFE', leftBorder: '#3B82F6', text: '#1E40AF' };

            return (
              <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  top: '24px',
                  right: '24px',
                  zIndex: 2147483647,
                  width: 'auto',
                  minWidth: '320px',
                  maxWidth: '400px',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${colors.leftBorder}`,
                  borderRadius: '8px',
                  color: colors.text,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ flexShrink: 0, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                  <AlertCircle size={20} strokeWidth={2.5} style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>
                  {toast.message}
                </div>
                <button 
                  onClick={() => setToast(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.text, padding: '2px', display: 'flex', flexShrink: 0 }}
                  title="Dismiss"
                >
                  <X size={18} strokeWidth={2.5} style={{ width: '18px', height: '18px' }} />
                </button>
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default TaskTable;
