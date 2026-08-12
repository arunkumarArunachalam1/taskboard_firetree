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

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [tasks, setTasks] = useState<TaskListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<number | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [listingFilters, setListingFilters] = useState<DashboardFilters>(initialListingFilters);
  const [kpiFilters, setKpiFilters] = useState<DashboardFilters>(initialKpiFilters);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (
    p: number = 1,
    s?: string,
    col?: number,
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

