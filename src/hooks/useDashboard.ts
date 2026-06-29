import { useState, useEffect, useCallback } from 'react';
import type { DashboardSummary, DashboardCharts, TaskListResponse } from '../types/dashboard.types';
import { getDashboardSummary, getDashboardCharts, getTaskList } from '../services/dashboard.service';

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [tasks, setTasks] = useState<TaskListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<number | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [loadingSummary, setLoadingSummary] = useState(true);
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
    const currentSz = sz !== undefined ? sz : pageSize;

    try {
      const data = await getTaskList(p, currentSz, {
        search: currentSearch,
        sortColumn: currentCol,
        sortDir: currentDir
      });
      setTasks(data);
      setPage(p);
      if (s !== undefined) setSearch(s);
      if (col !== undefined) setSortColumn(col);
      if (dir !== undefined) setSortDir(dir);
      if (sz !== undefined) setPageSize(sz);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoadingTasks(false);
    }
  }, [search, sortColumn, sortDir, pageSize]);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSummary(false));

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
    page, pageSize, fetchTasks,
    search, sortColumn, sortDir,
    error, setError
  };
}
