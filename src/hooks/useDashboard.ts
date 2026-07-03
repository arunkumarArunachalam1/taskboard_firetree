import { useState, useEffect, useCallback } from 'react';
import type { DashboardSummary, DashboardCharts, TaskListResponse } from '../types/dashboard.types';
import { getDashboardCharts, getTaskList } from '../services/dashboard.service';

export function useDashboard() {
  const [summary] = useState<DashboardSummary | null>({
    dueToday: 1,
    overdue: 76,
    pending: 21,
    completed: 22,
    totalAssigned: 120
  });
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [tasks, setTasks] = useState<TaskListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<number | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (
    p: number = 1,
    s?: string,
    col?: number,
    dir?: 'asc' | 'desc',
    sz?: number
  ) => {
    setLoadingTasks(true);
    setError(null);
    const currentSearch = s !== undefined ? s : search;
    const currentCol = col !== undefined ? col : sortColumn;
    const currentDir = dir !== undefined ? dir : sortDir;
    const currentSize = sz !== undefined ? sz : pageSize;

    try {
      const data = await getTaskList(p, currentSize, {
        search: currentSearch,
        sortColumn: currentCol,
        sortDir: currentDir
      });
      setTasks(data);
      setPage(p);
      if (sz !== undefined) setPageSize(sz);
      if (s !== undefined) setSearch(s);
      if (col !== undefined) setSortColumn(col);
      if (dir !== undefined) setSortDir(dir);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoadingTasks(false);
    }
  }, [search, sortColumn, sortDir, pageSize]);

  const fetchSummary = useCallback(() => {
    // Hidden API call for KPI cards
    setLoadingSummary(false);
  }, []);

  useEffect(() => {
    // fetchSummary(); // Hidden API call for KPI cards

    getDashboardCharts()
      .then(setCharts)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingCharts(false));

    fetchTasks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount, let fetchTasks be called manually for updates

  return {
    summary, loadingSummary,
    charts, loadingCharts,
    tasks, loadingTasks,
    page, pageSize, fetchTasks, fetchSummary,
    search, sortColumn, sortDir,
    error, setError
  };
}
