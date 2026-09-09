import { useState, useEffect, useCallback } from 'react';
import type { DashboardSummary, DashboardCharts, TaskListResponse, DashboardFilters } from '../types/dashboard.types';
import { getDashboardKPIs, getDashboardCharts, getTaskList, triggerHardRefresh } from '../services/dashboard.service';

const today = new Date();
const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const initialListingFilters: DashboardFilters = {
  assignedTo: '',
  role: '',
  status: '0', // Default to Completed: No
  taskType: '',
  startDate: formatDate(past30),
  endDate: formatDate(today)
};

export const initialKpiFilters: DashboardFilters = {
  assignedTo: '',
  role: '',
  status: 'all',
  taskType: '',
  startDate: '',
  endDate: ''
};

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function loadStickyFilters(defaultFilters: DashboardFilters, key: string): DashboardFilters {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      let startDate = parsed.startDate || '';
      let endDate = parsed.endDate || '';
      
      const rollingDaysForward = parsed.rollingDaysForward;
      const rollingDaysBackward = parsed.rollingDaysBackward;
      const currentToday = new Date();
      const todayStr = formatDate(currentToday);

      if (typeof rollingDaysForward === 'number') {
         startDate = todayStr;
         const newEnd = new Date(currentToday);
         newEnd.setDate(newEnd.getDate() + rollingDaysForward);
         endDate = formatDate(newEnd);
      } else if (typeof rollingDaysBackward === 'number') {
         endDate = todayStr;
         const newStart = new Date(currentToday);
         newStart.setDate(newStart.getDate() - rollingDaysBackward);
         startDate = formatDate(newStart);
      }
      
      return { ...defaultFilters, ...parsed, startDate, endDate };
    }
  } catch (e) {
    console.error(`Failed to load filters for ${key}`, e);
  }
  return defaultFilters;
}

function saveStickyFilters(filters: DashboardFilters, key: string) {
  try {
    let payload: any = { ...filters };
    if (filters.startDate && filters.endDate) {
      const start = parseLocalDate(filters.startDate);
      const end = parseLocalDate(filters.endDate);
      const todayStr = formatDate(new Date());
      
      if (filters.startDate === todayStr) {
        // Forward looking
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        payload.rollingDaysForward = diffDays;
      } else if (filters.endDate === todayStr) {
        // Backward looking
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        payload.rollingDaysBackward = diffDays;
      }
    }
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.error(`Failed to save filters for ${key}`, e);
  }
}

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [tasks, setTasks] = useState<TaskListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [listingFilters, setListingFilters] = useState<DashboardFilters>(() => loadStickyFilters(initialListingFilters, 'taskboard_listing_filters'));
  const [kpiFilters, setKpiFilters] = useState<DashboardFilters>(() => loadStickyFilters(initialKpiFilters, 'taskboard_kpi_filters'));



  useEffect(() => {
    saveStickyFilters(kpiFilters, 'taskboard_kpi_filters');
  }, [kpiFilters]);

  useEffect(() => {
    saveStickyFilters(listingFilters, 'taskboard_listing_filters');
  }, [listingFilters]);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (
    p: number = 1,
    s?: string,
    col?: string,
    dir?: 'asc' | 'desc',
    sz?: number,
    newFilters?: DashboardFilters
  ) => {
    setLoadingTasks(true);
    setError(null);
    const currentSearch = s !== undefined ? s : search;
    const currentCol = col !== undefined ? col : sortColumn;
    const currentDir = dir !== undefined ? dir : sortDir;
    const currentSize = sz !== undefined ? sz : pageSize;
    const currentFilters = newFilters !== undefined ? newFilters : listingFilters;

    try {
      const data = await getTaskList(p, currentSize, {
        search: currentSearch,
        sortColumn: currentCol,
        sortDir: currentDir,
        filters: currentFilters
      });
      setTasks(data);
      setPage(p);
      if (sz !== undefined) setPageSize(sz);
      if (s !== undefined) setSearch(s);
      if (col !== undefined) setSortColumn(col);
      if (dir !== undefined) setSortDir(dir);
      if (newFilters !== undefined) setListingFilters(newFilters);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoadingTasks(false);
    }
  }, [search, sortColumn, sortDir, pageSize, listingFilters]);

  const fetchSummary = useCallback(async (newFilters?: DashboardFilters) => {
    setLoadingSummary(true);
    const currentFilters = newFilters !== undefined ? newFilters : kpiFilters;
    return getDashboardKPIs(currentFilters)
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSummary(false));
  }, [kpiFilters]);

  const fetchCharts = useCallback(async (newFilters?: DashboardFilters) => {
    setLoadingCharts(true);
    const currentFilters = newFilters !== undefined ? newFilters : kpiFilters;
    return getDashboardCharts(currentFilters)
      .then(setCharts)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingCharts(false));
  }, [kpiFilters]);

  const handleHardRefresh = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setLoadingCharts(true);
      
      await triggerHardRefresh();
      
      // Run in parallel for KPI, Charts, and Tasks
      await Promise.all([
        fetchSummary(),
        fetchCharts(),
        fetchTasks(1)
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to perform hard refresh');
      setLoadingSummary(false);
      setLoadingCharts(false);
    }
  }, [fetchSummary, fetchCharts, fetchTasks]);

  const handleRefresh = useCallback(async () => {
    try {
      // Run in parallel for KPI, Charts, and Tasks
      await Promise.all([
        fetchSummary(),
        fetchCharts(),
        fetchTasks(page)
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh dashboard');
    }
  }, [fetchSummary, fetchCharts, fetchTasks, page]);

  useEffect(() => {
    const initFetch = async () => {
      try {
        // Run in parallel for KPI, Charts, and Tasks
        await Promise.all([
          fetchSummary(),
          fetchCharts(),
          fetchTasks(1)
        ]);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize dashboard');
      }
    };
    initFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, let fetchTasks be called manually for updates

  return {
    summary, loadingSummary,
    charts, loadingCharts,
    tasks, loadingTasks,
    page, pageSize, fetchTasks, fetchSummary, fetchCharts, handleHardRefresh, handleRefresh,
    search, sortColumn, sortDir, listingFilters, setListingFilters, kpiFilters, setKpiFilters,
    error, setError
  };
}

