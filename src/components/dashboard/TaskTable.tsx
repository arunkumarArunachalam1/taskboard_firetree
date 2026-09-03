import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle2, Activity, X, User, UserPlus, Check, Search, ChevronDown, ExternalLink, Plus, ArrowUp, ArrowDown, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskListResponse, Task, FacilityStaff, DashboardFilters } from '../../types/dashboard.types';
import { extractHrefFromHTML, extractTextFromHTML, markTasksCompleted, getFacilityStaff, assignTasks, getRoles, getTaskTypes, getTaskDetails } from '../../services/dashboard.service';
import { NewGeneralTaskModal } from './NewGeneralTaskModal';
import { NewWhereaboutsTaskModal } from './NewWhereaboutsTaskModal';
import { FilterPanel } from './FilterPanel';
import { ViewTaskModal } from './ViewTaskModal';
import { EditWhereaboutsModal } from './EditWhereaboutsModal';

import { WhereaboutsCompleteModal } from './WhereaboutsCompleteModal';
import { FollowupCompleteModal } from './FollowupCompleteModal';

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
    <span className="status-badge" style={{ color }}>
      <Icon size={10} strokeWidth={2.5} />
      {label}
    </span>
  );
};

// ── Skeleton ─────────────────────────────────────────────────────────────

const TableSkeleton: React.FC = () => (
  <div className="table-card">
    <div className="skeleton-header">
      <div className="skeleton skeleton-header-inner" />
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="skeleton-row">
        <div className="skeleton skeleton-cell-20" />
        <div className="skeleton skeleton-cell-15" />
        <div className="skeleton skeleton-cell-15" />
        <div className="skeleton skeleton-cell-10" />
        <div className="skeleton skeleton-cell-10" />
        <div className="skeleton skeleton-cell-action" />
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
  sortColumn?: string;
  sortDir: 'asc' | 'desc';
  onSortChange: (col: string, dir: 'asc' | 'desc') => void;
  onRefresh?: () => void;
  listingFilters: DashboardFilters;
  onApplyFilters: (filters: DashboardFilters) => void;
  onClearFilters: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────

const TaskTable: React.FC<TaskTableProps> = ({
  data, loading, page, pageSize = 25, onPageChange, onPageSizeChange,
  search, onSearchChange,
  sortColumn, sortDir, onSortChange, onRefresh,
  listingFilters, onApplyFilters, onClearFilters
}) => {
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' | 'warning' } | null>(null);
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
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});
  const [rolesMap, setRolesMap] = useState<Record<string, string>>({});
  const [taskTypesMap, setTaskTypesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadMappings = async () => {
      try {
        const staff = await getFacilityStaff(currentFacilityID);
        const sMap: Record<string, string> = {};
        staff.forEach(s => sMap[String(s.Value)] = s.Display);
        setStaffMap(sMap);

        const roles = await getRoles();
        const rMap: Record<string, string> = {};
        roles.forEach(r => rMap[String(r.value)] = r.label);
        setRolesMap(rMap);

        const types = await getTaskTypes();
        const tMap: Record<string, string> = {};
        types.forEach(t => tMap[String(t.value)] = t.label);
        setTaskTypesMap(tMap);
      } catch (e) {
        console.error("Failed to load filter mappings", e);
      }
    };
    loadMappings();
  }, [currentFacilityID]);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropdownUpward, setIsDropdownUpward] = useState(false);
  const [dropdownListMaxHeight, setDropdownListMaxHeight] = useState<number>(280);
  const reassignTriggerRef = useRef<HTMLDivElement>(null);

  const handleDropdownToggle = () => {
    setIsDropdownUpward(false);
    setDropdownListMaxHeight(95); // Decreased length so it fits safely inside
    setIsDropdownOpen(prev => !prev);
  };
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isGeneralTaskModalOpen, setIsGeneralTaskModalOpen] = useState(false);
  const [isWhereaboutsTaskModalOpen, setIsWhereaboutsTaskModalOpen] = useState(false);
  const [isViewTaskModalOpen, setIsViewTaskModalOpen] = useState(false);
  const [isEditWhereaboutsModalOpen, setIsEditWhereaboutsModalOpen] = useState(false);


  const [isWhereaboutsCompleteModalOpen, setIsWhereaboutsCompleteModalOpen] = useState(false);
  const [isFollowupCompleteModalOpen, setIsFollowupCompleteModalOpen] = useState(false);
  const [followupCompleteTaskId, setFollowupCompleteTaskId] = useState<number | null>(null);

  // Automatically open the Follow-up Modal if openTaskId is passed in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openTaskId = params.get('openTaskId');
    if (openTaskId) {
      setFollowupCompleteTaskId(parseInt(openTaskId, 10));
      setIsFollowupCompleteModalOpen(true);

      // Clean up URL so it doesn't re-open on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const [whereaboutsCompleteIds, setWhereaboutsCompleteIds] = useState<number[]>([]);
  const [whereaboutsCompleteClientId, setWhereaboutsCompleteClientId] = useState<number>(0);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskDescription, setSelectedTaskDescription] = useState<string>('');
  const [isListingFilterOpen, setIsListingFilterOpen] = useState(false);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        filterContainerRef.current && !filterContainerRef.current.contains(target) &&
        toggleButtonRef.current && !toggleButtonRef.current.contains(target)
      ) {
        setIsListingFilterOpen(false);
      }
    };
    if (isListingFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isListingFilterOpen]);

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

  const showToast = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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

  const handleRowClick = async (task: Task, e: React.MouseEvent<HTMLTableRowElement>) => {
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

    const taskTypeId = Number(task.TaskTypeID || 0);
    const typeStr = String(task.taskType || '').trim().toLowerCase();

    // Enforce 24-hour edit limit on completed tasks
    if (task.Status === 'Completed') {
      let isPast24HoursCompleted = false;
      let completedDateStr = task.CompletedDateTime;

      if (!completedDateStr) {
        try {
          // If completion date is not available in table data, fetch task details dynamically
          const details = await getTaskDetails(task.TaskID);
          completedDateStr = details.CompletedDateTime || details.CompletedDate || details.completed_date_time;
        } catch (err) {
          console.error("Failed to fetch task details for completion date", err);
        }
      }

      if (completedDateStr) {
        const completedDate = new Date(completedDateStr);
        if (!isNaN(completedDate.getTime())) {
          const now = new Date();
          const diffMs = now.getTime() - completedDate.getTime();
          if (diffMs > 24 * 60 * 60 * 1000) {
            isPast24HoursCompleted = true;
          }
        } else {
          // Unparseable date, fallback to read-only for safety
          isPast24HoursCompleted = true;
        }
      } else {
        // Missing completion date even after fetch, fallback to read-only for safety
        isPast24HoursCompleted = true;
      }

      if (isPast24HoursCompleted) {
        setSelectedTaskId(task.TaskID);
        setSelectedTaskDescription(task.TaskDescription);
        setIsViewTaskModalOpen(true);
        return;
      }
    }

    if (taskTypeId === 2 || typeStr.includes('whereabout')) {
      setSelectedTaskId(task.TaskID);
      setIsEditWhereaboutsModalOpen(true);
      return;
    }
    if (taskTypeId === 3 || typeStr.includes('follow')) {
      setFollowupCompleteTaskId(task.TaskID);
      setIsFollowupCompleteModalOpen(true);
      return;
    }
    if (taskTypeId === 1 || typeStr.includes('general') || (!typeStr.includes('whereabout') && !typeStr.includes('follow'))) {
      setSelectedTaskId(task.TaskID);
      setSelectedTaskDescription(task.TaskDescription);
      setIsViewTaskModalOpen(true);
      return;
    }
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

    const selectedWhereaboutsTasks = data ? data.tasks.filter(t => selectedIds.includes(t.TaskID) && Number(t.TaskTypeID) === 2) : [];
    const selectedFollowupTasks = data ? data.tasks.filter(t => selectedIds.includes(t.TaskID) && Number(t.TaskTypeID) === 3) : [];
    if (selectedWhereaboutsTasks.length > 0) {
      if (selectedWhereaboutsTasks.length > 1 || selectedWhereaboutsTasks.length !== selectedIds.length) {
        setToast({ message: 'Whereabouts tasks cannot be completed in bulk.', type: 'error' });
        return;
      }
      setWhereaboutsCompleteIds(selectedWhereaboutsTasks.map(t => t.TaskID));
      setWhereaboutsCompleteClientId(Number((selectedWhereaboutsTasks[0] as any)?.ClientID || 0));
      setIsWhereaboutsCompleteModalOpen(true);
      return;
    }

    if (selectedFollowupTasks.length > 0) {
      if (selectedFollowupTasks.length > 1 || selectedFollowupTasks.length !== selectedIds.length) {
        setToast({ message: 'Followup tasks must be completed individually.', type: 'error' });
        return;
      }
      setFollowupCompleteTaskId(selectedFollowupTasks[0].TaskID);
      setIsFollowupCompleteModalOpen(true);
      return;
    }

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
            const successMsg = selectedIds.length === 1
              ? 'Task marked complete successfully!'
              : 'Tasks marked complete successfully!';
            showToast(successMsg, 'success');
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
    const task = data?.tasks.find(t => t.TaskID === taskId);
    if (task && Number(task.TaskTypeID) === 2) {
      setWhereaboutsCompleteIds([taskId]);
      setWhereaboutsCompleteClientId(Number((task as any)?.ClientID || 0));
      setIsWhereaboutsCompleteModalOpen(true);
      return;
    }

    showConfirm(
      'Mark Task Complete',
      `Are you sure you want to mark the task "${extractTextFromHTML(taskName)}" complete?`,
      async () => {
        try {
          const response = await markTasksCompleted([taskId]);
          if (response.isSuccess === 1) {
            showToast('Task marked complete successfully!', 'success');
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
    const selectedTasks = data ? data.tasks.filter(t => reassignTaskIds.includes(t.TaskID)) : [];

    // Prevent assigning to the same person (t.AssignedTo holds the display name in the frontend)
    const isAlreadyAssigned = selectedTasks.some(t => {
      const currentAssignee = String(t.AssignedTo).replace(/<[^>]*>?/gm, '').trim();
      return currentAssignee === staffName.trim();
    });

    if (isAlreadyAssigned) {
      if (selectedTasks.length === 1) {
        showToast('The selected user is already assigned to this task.', 'warning');
      } else {
        showToast('One or more selected tasks are already assigned to the selected user.', 'warning');
      }
      return;
    }

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

  const handleSort = (colName: string) => {
    const isAsc = sortColumn === colName && sortDir === 'asc';
    onSortChange(colName, isAsc ? 'desc' : 'asc');
  };

  // Smart pagination: show up to 7 pages with ellipsis
  const getPageNumbers = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page - 1, page, page + 1, '…', totalPages];
  };

  const renderNewTaskDropdown = (alignRight: boolean) => (
    <div className="new-task-wrapper">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsNewTaskOpen(!isNewTaskOpen);
        }}
        className="btn-new-task"
      >
        <Plus size={14} strokeWidth={2.5} />
        New Task
        <ChevronDown size={14} className="ml-2px" />
      </button>

      {isNewTaskOpen && (
        <>
          <div
            className="new-task-overlay"
            onClick={(e) => {
              e.stopPropagation();
              setIsNewTaskOpen(false);
            }}
          />
          <div className={`new-task-dropdown-menu ${alignRight ? 'align-right' : 'align-left'}`}>
            <button
              type="button"
              className="new-task-dropdown-option"
              onClick={(e) => {
                e.stopPropagation();
                setIsNewTaskOpen(false);
                setIsGeneralTaskModalOpen(true);
              }}
            >
              General Task
            </button>
            <button
              type="button"
              className="new-task-dropdown-option"
              onClick={(e) => {
                e.stopPropagation();
                setIsNewTaskOpen(false);
                setIsWhereaboutsTaskModalOpen(true);
              }}
            >
              Whereabouts Task
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderSortIcon = (columnId: string) => {
    if (sortColumn === columnId) {
      return sortDir === 'asc'
        ? <ArrowUp size={14} className="sort-icon active" />
        : <ArrowDown size={14} className="sort-icon active" />;
    }
    return <ArrowUpDown size={14} className="sort-icon inactive" />;
  };

  return (
    <div className="table-card">
      {/* Header bar */}
      <div className="table-header-bar">
        {/* Left: Heading */}
        <div className="table-header-left">
          <div className="table-header-title-container">
            <span className="table-header-title">Tasks</span>
            <span className="table-header-count">{data.total}</span>
          </div>

          <div>
            {renderNewTaskDropdown(false)}
          </div>
        </div>

        {/* Center: Bulk Actions (flex-1 prevents right side from shifting) */}
        <div className="table-header-center">
          <AnimatePresence mode="popLayout">
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -10 }}
                transition={{ duration: 0.2 }}
                className="bulk-actions-container"
              >
                <div className="bulk-selected-badge">
                  <span>{selectedIds.length} Selected</span>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="btn-clear-selection"
                    onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
                    title="Deselect All"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>

                {selectedIds.length > 1 && (
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
                )}

                {selectedIds.length > 1 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => handleOpenReassignModal(selectedIds)}
                    className="btn-bulk-reassign"
                  >
                    <UserPlus size={14} strokeWidth={2.5} />
                    Bulk Reassign
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Search */}
        <div className="table-header-right">
          <button
            ref={toggleButtonRef}
            className="btn-filters"
            onClick={() => setIsListingFilterOpen(!isListingFilterOpen)}
          >
            <SlidersHorizontal size={15} />
            Filters
          </button>
          <input
            type="text"
            placeholder="Search tasks, clients, assignees…"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Active Filters Bar */}
      {(() => {
        const hasActiveFilters = listingFilters.status !== 'all' || !!listingFilters.startDate || !!listingFilters.endDate || !!listingFilters.assignedTo || !!listingFilters.role || !!listingFilters.taskType;
        if (!hasActiveFilters) return null;

        const clearFilter = (key: keyof DashboardFilters) => {
          const newFilters = { ...listingFilters, [key]: key === 'status' ? 'all' : '' };
          onApplyFilters(newFilters);
        };

        const formatDisplayDate = (d?: string) => {
          if (!d) return '';
          const p = d.split('-');
          return p.length === 3 ? `${p[1]}/${p[2]}/${p[0]}` : d;
        };

        return (
          <div className="active-filters-bar">
            <div className="active-filters-left">
              <div className="active-filters-title">
                <SlidersHorizontal size={15} />
                <span>Active Filters</span>
              </div>

              {listingFilters.status !== 'all' && (
                <div className="active-filter-tag">
                  Completed: {listingFilters.status === '1' ? 'Yes' : 'No'}
                  <X size={14} className="active-filter-tag-close" onClick={() => clearFilter('status')} />
                </div>
              )}
              {listingFilters.startDate && (
                <div className="active-filter-tag">
                  Start Date: {formatDisplayDate(listingFilters.startDate)}
                  <X size={14} className="active-filter-tag-close" onClick={() => clearFilter('startDate')} />
                </div>
              )}
              {listingFilters.endDate && (
                <div className="active-filter-tag">
                  End Date: {formatDisplayDate(listingFilters.endDate)}
                  <X size={14} className="active-filter-tag-close" onClick={() => clearFilter('endDate')} />
                </div>
              )}
              {listingFilters.assignedTo && (
                <div className="active-filter-tag">
                  Assigned User: {listingFilters.assignedTo === 'unassigned' ? 'Unassigned' : (staffMap[listingFilters.assignedTo] || listingFilters.assignedTo)}
                  <X size={14} className="active-filter-tag-close" onClick={() => clearFilter('assignedTo')} />
                </div>
              )}
              {listingFilters.role && (
                <div className="active-filter-tag">
                  Role: {rolesMap[listingFilters.role] || listingFilters.role}
                  <X size={14} className="active-filter-tag-close" onClick={() => clearFilter('role')} />
                </div>
              )}
              {listingFilters.taskType && (
                <div className="active-filter-tag">
                  Task Type: {taskTypesMap[listingFilters.taskType] || listingFilters.taskType}
                  <X size={14} className="active-filter-tag-close" onClick={() => clearFilter('taskType')} />
                </div>
              )}
            </div>


          </div>
        );
      })()}

      <div ref={filterContainerRef} className="filter-container-wrapper">
        <FilterPanel
          isOpen={isListingFilterOpen}
          filters={listingFilters}
          onApply={(f) => { onApplyFilters(f); setIsListingFilterOpen(false); }}
          onClear={() => { onClearFilters(); setIsListingFilterOpen(false); }}
          title=""
          layout="6col"
          mode="inline"
        />
      </div>

      {/* Table */}
      <div className="table-scroll" onClick={handleTableClick}>
        <table className="task-table">
          <thead>
            <tr>
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="checkbox-input"
                  title="Select All"
                />
              </th>
              <th className="th-sortable w-22" onClick={() => handleSort('TaskName')}>
                <div className="th-content">Task Name <span className="ml-6px">{renderSortIcon('TaskName')}</span></div>
              </th>
              <th className="th-sortable w-24" onClick={() => handleSort('TaskDescription')}>
                <div className="th-content">Description <span className="ml-6px">{renderSortIcon('TaskDescription')}</span></div>
              </th>
              {/* <th className="th-sortable text-center" onClick={() => handleSort('CreatedByDisplay')}>
                <div className="th-content-inline">Created By <span className="ml-6px">{renderSortIcon('CreatedByDisplay')}</span></div>
              </th> */}
              <th className="th-sortable text-left w-20" onClick={() => handleSort('Client')}>
                <div className="th-content">Client <span className="ml-6px">{renderSortIcon('Client')}</span></div>
              </th>
              <th className="th-sortable w-10" onClick={() => handleSort('ExpectedStartDate')}>
                <div className="th-content">Exp Start <span className="ml-6px">{renderSortIcon('ExpectedStartDate')}</span></div>
              </th>
              <th className="th-sortable w-10" onClick={() => handleSort('ExpectedDueDate')}>
                <div className="th-content">Due <span className="ml-6px">{renderSortIcon('ExpectedDueDate')}</span></div>
              </th>
              <th className="th-sortable w-10" onClick={() => handleSort('AssignedToDisplay')}>
                <div className="th-content">Assigned To <span className="ml-6px">{renderSortIcon('AssignedToDisplay')}</span></div>
              </th>
              {/* <th className="th-sortable text-center" onClick={() => handleSort('Facility')}>
                <div className="th-content-inline">Facility <span className="ml-6px">{renderSortIcon('Facility')}</span></div>
              </th> */}
              <th className="th-actions" style={{ paddingRight: '32px', width: '110px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={loading ? 'tbody-loading' : 'tbody-loaded'}>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="td-empty">
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
                  <td className="td-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(task.TaskID)}
                      onChange={() => handleSelectRow(task.TaskID)}
                      disabled={task.Status === 'Completed'}
                      className={task.Status === 'Completed' ? 'cursor-not-allowed' : 'cursor-pointer'}
                    />
                  </td>
                  <td>
                    <div dangerouslySetInnerHTML={{ __html: task.TaskName }} />
                  </td>
                  <td>
                    <div
                      dangerouslySetInnerHTML={{ __html: task.TaskDescription }}
                      className="task-description-cell"
                      title={extractTextFromHTML(task.TaskDescription)}
                    />
                  </td>
                  {/* <td style={{ textAlign: 'center' }}>
                    <span dangerouslySetInnerHTML={{ __html: task.CreatedBy }} />
                  </td> */}
                  <td className="td-left">
                    <div dangerouslySetInnerHTML={{ __html: task.ClientName }} className="client-name-wrapper" />
                  </td>
                  <td>
                    <span>{task.ExpectedStartDate}</span>
                  </td>
                  <td>
                    <span
                      className={task.Status === 'Late' ? 'font-bold' : 'font-normal'}
                      style={{ color: task.Status === 'Late' ? '#DC2626' : 'inherit' }}
                    >
                      {task.ExpectedDueDate}
                    </span>
                  </td>
                  <td>
                    <span>{task.AssignedTo}</span>
                  </td>
                  {/* <td style={{ textAlign: 'center' }}>
                    <span>{task.Facility}</span>
                  </td> */}
                  <td className="td-actions" style={{ paddingRight: '32px' }} onClick={(e) => e.stopPropagation()}>
                    {task.Status !== 'Completed' ? (
                      <div className="action-buttons-container">
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
                      <span className="status-completed-text">Completed</span>
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
        <div className="pagination-left">
          <div className="page-size-selector">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="page-size-select"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>
          <span className="page-info font-medium">
            Showing <strong>{Math.min((page - 1) * data.pageSize + 1, data.total)}</strong>–<strong>{Math.min(page * data.pageSize, data.total)}</strong> of <strong>{data.total}</strong>
          </span>
        </div>
        <div className="page-btns">
          <button className="page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="Previous">
            <ChevronLeft size={14} />
          </button>
          {getPageNumbers().map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
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
              <motion.div
                key="reassign-modal-overlay"
                className="taskboard-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Clicking outside the dropdown closes it */}
                <div
                  key="reassign-dropdown-backdrop"
                  onClick={() => setIsDropdownOpen(false)}
                  className="dropdown-backdrop"
                  style={{ display: isDropdownOpen ? 'block' : 'none' }}
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.18 }}
                  className="taskboard-modal-panel"
                  style={{ overflow: 'visible' }}
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
                  <div className="taskboard-modal-body" style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
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
                              <span className="dot bg-blue" />
                              <span dangerouslySetInnerHTML={{ __html: t.TaskName }} className="text-truncate" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Searchable Dropdown Field */}
                    <div className="relative-container">
                      <label className="taskboard-field-label">
                        New Assignee
                      </label>
                      <div
                        ref={reassignTriggerRef}
                        onClick={handleDropdownToggle}
                        className={`taskboard-dropdown-trigger${isDropdownOpen ? ' open' : ''}`}
                      >
                        <span className={`trigger-text${selectedStaffId ? ' has-value' : ''}`}>
                          {selectedStaffId
                            ? staffList.find(s => s.Value === selectedStaffId)?.Display
                            : 'select assignee...'}
                        </span>
                        <span className={`trigger-icon${isDropdownOpen ? ' open' : ''}`}>
                          <ChevronDown size={18} />
                        </span>
                      </div>

                      <div key="reassign-dropdown-panel" className={`taskboard-dropdown-panel ${isDropdownUpward ? 'open-upward' : ''}`} style={{ display: isDropdownOpen ? 'flex' : 'none' }}>
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
                        <div className="taskboard-dropdown-list" style={{ maxHeight: `${Math.min(280, dropdownListMaxHeight)}px` }}>
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
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="taskboard-modal-footer" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
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
              </motion.div>
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
              <motion.div
                key="confirm-modal-overlay"
                className="taskboard-modal-overlay overlay-z-20000"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
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
                                    <span dangerouslySetInnerHTML={{ __html: t.TaskName }} className="text-truncate" />
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
                      className={`taskboard-btn-primary ${type === 'complete' ? 'green' : type === 'reassign' ? 'blue' : 'amber'} text-white`}
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              </motion.div>
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
              error: { bg: '#FEF2F2', border: '#FCA5A5', leftBorder: '#EF4444', text: '#991B1B' },
              warning: { bg: '#FFFBEB', border: '#FDE68A', leftBorder: '#F59E0B', text: '#B45309' }
            }[toast.type] || { bg: '#EFF6FF', border: '#BFDBFE', leftBorder: '#3B82F6', text: '#1E40AF' };

            return (
              <motion.div
                key="toast-notification"
                className="taskboard-toast"
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{ backgroundColor: colors.bg, borderColor: colors.border, borderLeftColor: colors.leftBorder, color: colors.text }}
              >
                <div className="toast-icon-container">
                  <AlertCircle size={20} strokeWidth={2.5} className="toast-icon" />
                </div>
                <div className="toast-content">
                  {toast.message}
                </div>
                <button
                  onClick={() => setToast(null)}
                  style={{ color: colors.text }}
                  className="toast-close"
                  title="Dismiss"
                >
                  <X size={18} strokeWidth={2.5} className="toast-close-icon" />
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

      <ViewTaskModal
        isOpen={isViewTaskModalOpen}
        onClose={() => setIsViewTaskModalOpen(false)}
        taskId={selectedTaskId}
        taskDescription={selectedTaskDescription}
      />

      <EditWhereaboutsModal
        isOpen={isEditWhereaboutsModalOpen}
        onClose={() => setIsEditWhereaboutsModalOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
        taskId={selectedTaskId}
        showToast={showToast}
      />



      <WhereaboutsCompleteModal
        isOpen={isWhereaboutsCompleteModalOpen}
        onClose={() => setIsWhereaboutsCompleteModalOpen(false)}
        onSuccess={() => {
          const successMsg = whereaboutsCompleteIds.length === 1
            ? 'Whereabouts task marked complete successfully.'
            : 'Whereabouts tasks marked complete successfully.';
          showToast(successMsg, 'success');
          setSelectedIds([]);
          if (onRefresh) onRefresh();
          else onPageChange(page);
        }}
        selectedTaskIds={whereaboutsCompleteIds}
        selectedClientId={whereaboutsCompleteClientId}
      />

      {followupCompleteTaskId !== null && (
        <FollowupCompleteModal
          isOpen={isFollowupCompleteModalOpen}
          onClose={() => setIsFollowupCompleteModalOpen(false)}
          selectedTaskId={followupCompleteTaskId}
          onSuccess={() => {
            showToast('Followup task marked complete successfully.', 'success');
            setSelectedIds([]);
            if (onRefresh) onRefresh();
            else onPageChange(page);
          }}
        />
      )}

    </div>
  );
};

export default TaskTable;
// Force sync
