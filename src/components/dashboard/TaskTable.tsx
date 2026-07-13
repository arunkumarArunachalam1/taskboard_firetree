import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle2, Activity, X, User, UserPlus, Check, Search, ChevronDown, ExternalLink, Plus, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskListResponse, Task, FacilityStaff } from '../../types/dashboard.types';
import { extractHrefFromHTML, extractTextFromHTML, markTasksCompleted, getFacilityStaff, assignTasks } from '../../services/dashboard.service';
import { NewGeneralTaskModal } from './NewGeneralTaskModal';
import { NewWhereaboutsTaskModal } from './NewWhereaboutsTaskModal';

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

export const appendOrUpdateReturnTo = (urlStr: string, returnToValue: string, taskName?: string): string => {
  let normalizedReturnTo = returnToValue;
  if (normalizedReturnTo === '/Taskboard' || normalizedReturnTo === '/Taskboard/') {
    normalizedReturnTo = '/ReactTaskBoard/react';
  } else if (normalizedReturnTo.startsWith('/Taskboard?')) {
    normalizedReturnTo = normalizedReturnTo.replace('/Taskboard', '/ReactTaskBoard/react');
  }

  try {
    const isAbsolute = urlStr.startsWith('http://') || urlStr.startsWith('https://');
    const dummyBase = 'http://dummy.com';
    const parsedUrl = new URL(urlStr, isAbsolute ? undefined : dummyBase);

    const originalReturnTo = parsedUrl.searchParams.get('returnTo');
    if (originalReturnTo) {
      let newReturnTo = originalReturnTo;
      if (newReturnTo.includes('returnTo=')) {
        newReturnTo = newReturnTo.replace(/returnTo=[^&]*/, `returnTo=${encodeURIComponent(normalizedReturnTo)}`);
      } else {
        newReturnTo = newReturnTo + (newReturnTo.includes('?') ? '&' : '?') + `returnTo=${encodeURIComponent(normalizedReturnTo)}`;
      }
      parsedUrl.searchParams.set('returnTo', newReturnTo);
    } else {
      parsedUrl.searchParams.set('returnTo', normalizedReturnTo);
    }

    if (taskName) {
      parsedUrl.searchParams.set('taskName', taskName);
    }

    return isAbsolute ? parsedUrl.toString() : (parsedUrl.pathname + parsedUrl.search + parsedUrl.hash);
  } catch (e) {
    let cleanUrl = urlStr;
    if (cleanUrl.includes('returnTo=')) {
      const match = cleanUrl.match(/returnTo=([^&]*)/);
      if (match) {
        try {
          const decodedOriginal = decodeURIComponent(match[1]);
          let updatedOriginal = decodedOriginal;
          if (updatedOriginal.includes('returnTo=')) {
            updatedOriginal = updatedOriginal.replace(/returnTo=[^&]*/, `returnTo=${encodeURIComponent(normalizedReturnTo)}`);
          } else {
            updatedOriginal = updatedOriginal + (updatedOriginal.includes('?') ? '&' : '?') + `returnTo=${encodeURIComponent(normalizedReturnTo)}`;
          }
          cleanUrl = cleanUrl.replace(/returnTo=[^&]*/, `returnTo=${encodeURIComponent(updatedOriginal)}`);
        } catch (err) { }
      } else {
        cleanUrl = cleanUrl.replace(/returnTo=[^&]*/, `returnTo=${encodeURIComponent(normalizedReturnTo)}`);
      }
    } else {
      cleanUrl = cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + `returnTo=${encodeURIComponent(normalizedReturnTo)}`;
    }

    if (taskName) {
      cleanUrl = cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + `taskName=${encodeURIComponent(taskName)}`;
    }
    return cleanUrl;
  }
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
  pageSize?: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (sz: number) => void;
  search: string;
  onSearchChange: (s: string) => void;
  sortColumn?: number;
  sortDir: 'asc' | 'desc';
  onSortChange: (col: number, dir: 'asc' | 'desc') => void;
  onRefresh?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────

const TaskTable: React.FC<TaskTableProps> = ({
  data, loading, page, pageSize = 25, onPageChange, onPageSizeChange,
  search, onSearchChange,
  sortColumn, sortDir, onSortChange, onRefresh
}) => {
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    // Only sync if cleared externally to prevent cursor jumping while typing
    if (search === '') {
      setLocalSearch('');
    }
  }, [search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [localSearch, search, onSearchChange]);

  // Reassign Modal State
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignTaskIds, setReassignTaskIds] = useState<number[]>([]);

  const { currentFacilityID } = useAppContext();

  const [staffList, setStaffList] = useState<FacilityStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isGeneralTaskModalOpen, setIsGeneralTaskModalOpen] = useState(false);
  const [isWhereaboutsTaskModalOpen, setIsWhereaboutsTaskModalOpen] = useState(false);

  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'complete' | 'reassign' | 'warning';
    taskIds?: number[];
  } | null>(null);

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'complete' | 'reassign' | 'warning' = 'warning',
    taskIds?: number[]
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      type,
      taskIds
    });
  };

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

  if (!data) return <TableSkeleton />;

  const totalPages = Math.ceil(data.total / data.pageSize);
  const filtered = data.tasks;

  const navigateToTask = (task: Task) => {
    const rawUrl = extractHrefFromHTML(task.TaskDescription) || extractHrefFromHTML(task.TaskName) || extractHrefFromHTML(task.ClientName);
    if (rawUrl) {
      let url = rawUrl;
      // Resolve relative URLs to the index.cfm base path
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
        const path = window.location.pathname;
        const indexCFMIdx = path.toLowerCase().indexOf('index.cfm');
        if (indexCFMIdx !== -1) {
          const base = path.substring(0, indexCFMIdx + 9);
          url = `${base}/${url}`;
        } else {
          url = `/${url}`;
        }
      }

      // Always override or append the returnTo parameter so the user redirects back to the React Taskboard
      const returnToUrl = window.location.pathname + window.location.search;
      const cleanTaskName = extractTextFromHTML(task.TaskName);
      url = appendOrUpdateReturnTo(url, returnToUrl, cleanTaskName);

      window.location.href = url;
    } else {
      showToast(`No linked page for task: "${extractTextFromHTML(task.TaskName)}"`, 'info');
    }
  };

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

    navigateToTask(task);
  };

  const handleTableClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.tagName === 'A' ? target as HTMLAnchorElement : target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        e.preventDefault();

        let url = href;
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
          const path = window.location.pathname;
          const indexCFMIdx = path.toLowerCase().indexOf('index.cfm');
          if (indexCFMIdx !== -1) {
            const base = path.substring(0, indexCFMIdx + 9);
            url = `${base}/${url}`;
          } else {
            url = `/${url}`;
          }
        }

        // Always override or append the returnTo parameter so the user redirects back to the React Taskboard
        const returnToUrl = window.location.pathname + window.location.search;

        // Find task details from the row
        const row = target.closest('tr');
        const taskIdStr = row?.getAttribute('data-task-id');
        const taskId = taskIdStr ? parseInt(taskIdStr) : null;
        const task = taskId ? data.tasks.find(t => t.TaskID === taskId) : null;
        const cleanTaskName = task ? extractTextFromHTML(task.TaskName) : undefined;

        url = appendOrUpdateReturnTo(url, returnToUrl, cleanTaskName);

        window.location.href = url;
      }
    }
  };

  const handleSelectRow = (taskId: number) => {
    setSelectedIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const selectableTasks = filtered.filter(t => t.Status !== 'Completed');
  const isAllSelected = selectableTasks.length > 0 && selectableTasks.every(task => selectedIds.includes(task.TaskID));

  const handleSelectAll = () => {
    const selectableTaskIds = selectableTasks.map(t => t.TaskID);
    const isAllSelectableSelected = selectableTaskIds.length > 0 && selectableTaskIds.every(id => selectedIds.includes(id));

    if (isAllSelectableSelected) {
      setSelectedIds(prev => prev.filter(id => !selectableTaskIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const next = [...prev];
        selectableTaskIds.forEach(id => {
          if (!next.includes(id)) {
            next.push(id);
          }
        });
        return next;
      });
    }
  };

  const handleMarkSelectedComplete = () => {
    if (selectedIds.length === 0) return;

    const confirmMessage = selectedIds.length === 1
      ? 'Are you sure you want to mark the selected task complete?'
      : `Are you sure you want to mark the ${selectedIds.length} selected tasks complete?`;

    showConfirm(
      'Mark Tasks Complete',
      confirmMessage,
      async () => {
        try {
          const response = await markTasksCompleted(selectedIds);
          if (response.isSuccess === 1) {
            showToast(response.successMessage || 'Tasks marked complete successfully!', 'success');
            setSelectedIds([]);
            if (onRefresh) onRefresh();
            else onPageChange(page);
          } else {
            showToast(response.errorMessage || 'Failed to complete selected tasks.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'An error occurred while marking tasks complete.', 'error');
        }
      },
      'complete',
      selectedIds
    );
  };

  const handleMarkSingleComplete = (taskId: number, taskName: string) => {
    showConfirm(
      'Mark Task Complete',
      `Are you sure you want to mark the task "${extractTextFromHTML(taskName)}" complete?`,
      async () => {
        try {
          const response = await markTasksCompleted([taskId]);
          if (response.isSuccess === 1) {
            showToast(response.successMessage || 'Task marked complete successfully!', 'success');
            setSelectedIds(prev => prev.filter(id => id !== taskId));
            if (onRefresh) onRefresh();
            else onPageChange(page);
          } else {
            showToast(response.errorMessage || 'Failed to complete task.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'An error occurred while marking task complete.', 'error');
        }
      },
      'complete',
      [taskId]
    );
  };

  const handleOpenReassignModal = async (taskIds: number[]) => {
    setReassignTaskIds(taskIds);
    setIsReassignOpen(true);
    setLoadingStaff(true);
    setSelectedStaffId(null);
    setStaffSearch('');
    setIsDropdownOpen(false);
    try {
      const staff = await getFacilityStaff(currentFacilityID);
      setStaffList(staff.filter(s => s.IsInactive !== 1));
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch facility staff.', 'error');
      setIsReassignOpen(false);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleReassignSubmit = async () => {
    if (!selectedStaffId) return;

    const staffName = staffList.find(s => s.Value === selectedStaffId)?.Display || 'selected staff';
    const taskCount = reassignTaskIds.length;
    const confirmMessage = taskCount === 1
      ? `Are you sure you want to reassign the selected task to ${staffName}?`
      : `Are you sure you want to reassign the ${taskCount} selected tasks to ${staffName}?`;

    showConfirm(
      'Reassign Tasks',
      confirmMessage,
      async () => {
        try {
          const response = await assignTasks(reassignTaskIds, selectedStaffId);
          if (response.isSuccess === 1) {
            showToast(response.successMessage || 'Tasks reassigned successfully!', 'success');
            setIsReassignOpen(false);
            setSelectedIds([]);
            if (onRefresh) onRefresh();
            else onPageChange(page);
          } else {
            showToast(response.errorMessage || 'Failed to reassign tasks.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'An error occurred while reassigning tasks.', 'error');
        }
      },
      'reassign',
      reassignTaskIds
    );
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

  const renderNewTaskDropdown = (alignRight: boolean) => (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsNewTaskOpen(!isNewTaskOpen)}
        className="btn-new-task"
      >
        <Plus size={14} strokeWidth={2.5} />
        New Task
        <ChevronDown size={14} style={{ marginLeft: '2px' }} />
      </button>

      <AnimatePresence>
        {isNewTaskOpen && (
          <>
            <div
              onClick={() => setIsNewTaskOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', top: '100%', [alignRight ? 'right' : 'left']: 0, marginTop: 4,
                backgroundColor: '#fff', borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid var(--border)',
                minWidth: 160, zIndex: 100, overflow: 'hidden'
              }}
            >
              <button
                className="taskboard-dropdown-option"
                onClick={() => {
                  setIsNewTaskOpen(false);
                  setIsGeneralTaskModalOpen(true);
                }}
              >
                General Task
              </button>
              <button
                className="taskboard-dropdown-option"
                onClick={() => {
                  setIsNewTaskOpen(false);
                  setIsWhereaboutsTaskModalOpen(true);
                }}
              >
                Whereabouts Task
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  const renderSortIcon = (columnId: number) => {
    if (sortColumn === columnId) {
      return sortDir === 'asc' 
        ? <ArrowUp size={14} style={{ display: 'inline-block', flexShrink: 0, color: '#2563EB', width: 14, height: 14 }} /> 
        : <ArrowDown size={14} style={{ display: 'inline-block', flexShrink: 0, color: '#2563EB', width: 14, height: 14 }} />;
    }
    return <ArrowUpDown size={14} style={{ display: 'inline-block', flexShrink: 0, opacity: 0.3, color: '#4B5563', width: 14, height: 14 }} />;
  };

  return (
    <div className="table-card">
      {/* Header bar */}
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 16
      }}>
        {/* Left: Heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Tasks</span>
            <span style={{
              background: 'var(--green)', color: '#fff', borderRadius: 20,
              fontSize: 11, fontWeight: 700, padding: '2px 8px'
            }}>{data.total}</span>
          </div>

          <div>
            {renderNewTaskDropdown(false)}
          </div>
        </div>

        {/* Center: Bulk Actions (flex-1 prevents right side from shifting) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AnimatePresence mode="popLayout">
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <div className="bulk-selected-badge">
                  <span>{selectedIds.length} Selected</span>
                  <button
                    onClick={() => setSelectedIds([])}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 0, display: 'flex', alignItems: 'center',
                      color: '#64748B', marginLeft: 8, transition: 'color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
                    title="Deselect All"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>

                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleMarkSelectedComplete}
                  className="btn-bulk-complete"
                >
                  <CheckCircle2 size={14} strokeWidth={2.5} />
                  Bulk Complete
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleOpenReassignModal(selectedIds)}
                  className="btn-bulk-reassign"
                >
                  <UserPlus size={14} strokeWidth={2.5} />
                  Reassign
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: New Task & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>


          <input
            type="text"
            placeholder="Search tasks, clients, assignees…"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
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
      <div className="table-scroll" onClick={handleTableClick}>
        <table className="task-table">
          <thead>
            <tr>
              <th style={{ userSelect: 'none', textAlign: 'center', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer', verticalAlign: 'middle' }}
                  title="Select All"
                />
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', width: '22%' }} onClick={() => handleSort(0)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>Task Name <span style={{ marginLeft: 6 }}>{renderSortIcon(0)}</span></div>
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', width: '24%' }} onClick={() => handleSort(1)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>Description <span style={{ marginLeft: 6 }}>{renderSortIcon(1)}</span></div>
              </th>
              {/* <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={() => handleSort(2)}>
                <div style={{ display: 'inline-flex', alignItems: 'center' }}>Created By <span style={{ marginLeft: 6 }}>{renderSortIcon(2)}</span></div>
              </th> */}
              <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'left', whiteSpace: 'nowrap', width: '20%' }} onClick={() => handleSort(3)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>Client <span style={{ marginLeft: 6 }}>{renderSortIcon(3)}</span></div>
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', width: '10%' }} onClick={() => handleSort(4)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>Exp Start <span style={{ marginLeft: 6 }}>{renderSortIcon(4)}</span></div>
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', width: '10%' }} onClick={() => handleSort(5)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>Due <span style={{ marginLeft: 6 }}>{renderSortIcon(5)}</span></div>
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', width: '10%' }} onClick={() => handleSort(6)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>Assigned To <span style={{ marginLeft: 6 }}>{renderSortIcon(6)}</span></div>
              </th>
              {/* <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={() => handleSort(7)}>
                <div style={{ display: 'inline-flex', alignItems: 'center' }}>Facility <span style={{ marginLeft: 6 }}>{renderSortIcon(7)}</span></div>
              </th> */}
              <th style={{ userSelect: 'none', textAlign: 'center', width: '90px', paddingRight: '16px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-text)', fontSize: 13 }}>
                  No tasks match your search.
                </td>
              </tr>
            ) : (
              filtered.map(task => (
                <tr
                  key={task.TaskID}
                  data-task-id={task.TaskID}
                  className={task.Status === 'Late' ? 'row-late' : ''}
                  onClick={(e) => handleRowClick(task, e)}
                >
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(task.TaskID)}
                      onChange={() => handleSelectRow(task.TaskID)}
                      disabled={task.Status === 'Completed'}
                      style={{ cursor: task.Status === 'Completed' ? 'not-allowed' : 'pointer' }}
                    />
                  </td>
                  <td>
                    <div dangerouslySetInnerHTML={{ __html: task.TaskName }} />
                  </td>
                  <td>
                    <div
                      dangerouslySetInnerHTML={{ __html: task.TaskDescription }}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word'
                      }}
                      title={extractTextFromHTML(task.TaskDescription)}
                    />
                  </td>
                  {/* <td style={{ textAlign: 'center' }}>
                    <span dangerouslySetInnerHTML={{ __html: task.CreatedBy }} />
                  </td> */}
                  <td style={{ textAlign: 'left' }}>
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
                  {/* <td style={{ textAlign: 'center' }}>
                    <span>{task.Facility}</span>
                  </td> */}
                  <td style={{ textAlign: 'center', paddingRight: '16px' }} onClick={(e) => e.stopPropagation()}>
                    {task.Status !== 'Completed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleMarkSingleComplete(task.TaskID, task.TaskName)}
                          title="Mark Complete"
                          className="btn-action-complete"
                        >
                          <Check size={12} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => handleOpenReassignModal([task.TaskID])}
                          title="Reassign Task"
                          className="btn-action-reassign"
                        >
                          <User size={12} strokeWidth={2.5} />
                        </button>
                        {(extractHrefFromHTML(task.TaskDescription) || extractHrefFromHTML(task.TaskName) || extractHrefFromHTML(task.ClientName)) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToTask(task);
                            }}
                            title="Open Linked Page"
                            className="btn-action-view"
                          >
                            <ExternalLink size={12} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '11px' }}>Completed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--gray-text)', fontWeight: 600 }}>
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              style={{
                padding: '4px 28px 4px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                background: '#fff',
                cursor: 'pointer',
                color: 'var(--text)',
                outline: 'none',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
              }}
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>
          <span className="page-info" style={{ fontWeight: 500 }}>
            Showing <strong>{Math.min((page - 1) * data.pageSize + 1, data.total)}</strong>–<strong>{Math.min(page * data.pageSize, data.total)}</strong> of <strong>{data.total}</strong>
          </span>
        </div>
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
          {isReassignOpen && (() => {
            const selectedTasks = data ? data.tasks.filter(t => reassignTaskIds.includes(t.TaskID)) : [];
            return (
              <div
                className="taskboard-modal-overlay"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.45)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 10000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}
              >
                {/* Clicking outside the dropdown closes it */}
                {isDropdownOpen && (
                  <div
                    onClick={() => setIsDropdownOpen(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 10090,
                      backgroundColor: 'transparent'
                    }}
                  />
                )}

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.18 }}
                  className="taskboard-modal-panel"
                >
                  {/* Modal Header */}
                  <div className="taskboard-modal-header">
                    <h3>
                      Reassign {reassignTaskIds.length === 1 ? 'Task' : `${reassignTaskIds.length} Tasks`}
                    </h3>
                    <button
                      onClick={() => setIsReassignOpen(false)}
                      className="taskboard-modal-close"
                    >
                      <X size={18} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="taskboard-modal-body">
                    {/* Task Display */}
                    <div>
                      <label className="taskboard-field-label">
                        {reassignTaskIds.length === 1 ? 'Task to Reassign' : `Tasks to Reassign (${reassignTaskIds.length})`}
                      </label>
                      {selectedTasks.length === 1 ? (
                        <div
                          className="taskboard-task-display"
                          dangerouslySetInnerHTML={{ __html: selectedTasks[0].TaskName }}
                        />
                      ) : (
                        <div className="taskboard-task-list">
                          {selectedTasks.map(t => (
                            <div key={t.TaskID} className="taskboard-task-list-item">
                              <span className="dot" style={{ backgroundColor: '#3B82F6' }} />
                              <span dangerouslySetInnerHTML={{ __html: t.TaskName }} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Searchable Dropdown Field */}
                    <div style={{ position: 'relative' }}>
                      <label className="taskboard-field-label">
                        New Assignee
                      </label>
                      <div
                        onClick={() => setIsDropdownOpen(prev => !prev)}
                        className={`taskboard-dropdown-trigger${isDropdownOpen ? ' open' : ''}`}
                      >
                        <span className={`trigger-text${selectedStaffId ? ' has-value' : ''}`}>
                          {selectedStaffId
                            ? staffList.find(s => s.Value === selectedStaffId)?.Display
                            : 'Search and select assignee...'}
                        </span>
                        <span className={`trigger-icon${isDropdownOpen ? ' open' : ''}`}>
                          <ChevronDown size={18} />
                        </span>
                      </div>

                      {isDropdownOpen && (
                        <div className="taskboard-dropdown-panel">
                          {/* Search bar inside dropdown */}
                          <div className="taskboard-dropdown-search">
                            <span className="search-icon">
                              <Search size={14} />
                            </span>
                            <input
                              type="text"
                              placeholder="Search staff members..."
                              value={staffSearch}
                              onChange={(e) => setStaffSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>

                          {/* Staff List */}
                          <div className="taskboard-dropdown-list">
                            {loadingStaff ? (
                              <div className="taskboard-dropdown-empty">
                                Loading staff...
                              </div>
                            ) : (() => {
                              const filteredStaff = staffList.filter(s =>
                                s.Display.toLowerCase().includes(staffSearch.toLowerCase())
                              );

                              if (filteredStaff.length === 0) {
                                return (
                                  <div className="taskboard-dropdown-empty">
                                    No staff members found.
                                  </div>
                                );
                              }

                              return filteredStaff.map(staff => {
                                const isSelected = selectedStaffId === staff.Value;
                                return (
                                  <div
                                    key={staff.Value}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStaffId(staff.Value);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`taskboard-dropdown-option${isSelected ? ' selected' : ''}`}
                                  >
                                    <span>{staff.Display}</span>
                                    {isSelected && (
                                      <span className="check-icon">
                                        <Check size={14} strokeWidth={2.5} />
                                      </span>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="taskboard-modal-footer">
                    <button
                      onClick={() => setIsReassignOpen(false)}
                      className="taskboard-btn-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReassignSubmit}
                      disabled={!selectedStaffId}
                      className="taskboard-btn-primary blue"
                    >
                      Reassign
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {confirmDialog && confirmDialog.isOpen && (() => {
            const type = confirmDialog.type || 'warning';
            const dialogTheme = {
              complete: { Icon: Check, iconColor: '#16A34A' },
              reassign: { Icon: User, iconColor: '#2563EB' },
              warning: { Icon: AlertCircle, iconColor: '#D97706' }
            }[type];

            const IconComponent = dialogTheme.Icon;

            return (
              <div
                className="taskboard-modal-overlay"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.45)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 20000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.18 }}
                  className="taskboard-modal-panel"
                >
                  {/* Modal Header */}
                  <div className="taskboard-modal-header">
                    <h3>{confirmDialog.title}</h3>
                    <button
                      onClick={() => setConfirmDialog(null)}
                      className="taskboard-modal-close"
                    >
                      <X size={18} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="taskboard-modal-body">
                    {/* Alert Banner / Message */}
                    <div className={`taskboard-alert-banner ${type}`}>
                      <div className={`taskboard-alert-icon ${type}`}>
                        <IconComponent size={20} strokeWidth={2.2} />
                      </div>
                      <div className="taskboard-alert-content">
                        <span className="taskboard-alert-title">
                          Confirmation Required
                        </span>
                        <p className="taskboard-alert-message">
                          {confirmDialog.message}
                        </p>
                      </div>
                    </div>

                    {/* Task details preview */}
                    {confirmDialog.taskIds && confirmDialog.taskIds.length > 0 && (
                      <div>
                        <label className="taskboard-field-label">
                          {confirmDialog.taskIds.length === 1 ? 'Selected Task' : `Selected Tasks (${confirmDialog.taskIds.length})`}
                        </label>
                        {(() => {
                          const tasksToComplete = data ? data.tasks.filter(t => confirmDialog.taskIds?.includes(t.TaskID)) : [];
                          if (tasksToComplete.length === 1) {
                            return (
                              <div
                                className="taskboard-task-display"
                                dangerouslySetInnerHTML={{ __html: tasksToComplete[0].TaskName }}
                              />
                            );
                          } else if (tasksToComplete.length > 1) {
                            return (
                              <div className="taskboard-task-list">
                                {tasksToComplete.map(t => (
                                  <div key={t.TaskID} className="taskboard-task-list-item">
                                    <span className="dot" style={{ backgroundColor: dialogTheme.iconColor }} />
                                    <span dangerouslySetInnerHTML={{ __html: t.TaskName }} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="taskboard-modal-footer">
                    <button
                      onClick={() => setConfirmDialog(null)}
                      className="taskboard-btn-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        confirmDialog.onConfirm();
                        setConfirmDialog(null);
                      }}
                      className={`taskboard-btn-primary ${type === 'complete' ? 'green' : type === 'reassign' ? 'blue' : 'amber'}`}
                      style={{ color: '#ffffff' }}
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}

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
                className="taskboard-toast"
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

      <NewGeneralTaskModal
        isOpen={isGeneralTaskModalOpen}
        onClose={() => setIsGeneralTaskModalOpen(false)}
        onTaskCreated={() => {
          showToast('Task created successfully.', 'success');
          if (onRefresh) onRefresh();
        }}
      />

      <NewWhereaboutsTaskModal
        isOpen={isWhereaboutsTaskModalOpen}
        onClose={() => setIsWhereaboutsTaskModalOpen(false)}
        onTaskCreated={() => {
          showToast('Whereabouts Task created successfully.', 'success');
          if (onRefresh) onRefresh();
        }}
      />

    </div>
  );
};

export default TaskTable;
// Force sync
