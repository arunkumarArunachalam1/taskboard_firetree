import { useState, useEffect, useCallback } from 'react';
import type { DashboardSummary, DashboardCharts, TaskListResponse } from '../types/dashboard.types';
import { getDashboardSummary, getDashboardCharts, getTaskList } from '../services/dashboard.service';

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [tasks, setTasks] = useState<TaskListResponse | null>(null);
  const [page, setPage] = useState(1);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts, setLoadingCharts]   = useState(true);
  const [loadingTasks,  setLoadingTasks]    = useState(true);

  const fetchTasks = useCallback(async (p: number = 1) => {
    setLoadingTasks(true);
    try {
      const data = await getTaskList(p);
      setTasks(data);
      setPage(p);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .finally(() => setLoadingSummary(false));

    getDashboardCharts()
      .then(setCharts)
      .finally(() => setLoadingCharts(false));

    fetchTasks(1);
  }, [fetchTasks]);

  return {
    summary, loadingSummary,
    charts,  loadingCharts,
    tasks,   loadingTasks,
    page, fetchTasks,
  };
}
