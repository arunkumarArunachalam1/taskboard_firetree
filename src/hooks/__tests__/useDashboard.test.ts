import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDashboard, initialListingFilters } from '../useDashboard';
import * as dashboardService from '../../services/dashboard.service';

vi.mock('../../services/dashboard.service', () => ({
  getDashboardKPIs: vi.fn(),
  getDashboardCharts: vi.fn(),
  getTaskList: vi.fn(),
  triggerHardRefresh: vi.fn(),
}));

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default state', async () => {
    vi.mocked(dashboardService.getDashboardKPIs).mockResolvedValue({} as any);
    vi.mocked(dashboardService.getDashboardCharts).mockResolvedValue({} as any);
    vi.mocked(dashboardService.getTaskList).mockResolvedValue({ data: [], recordsTotal: 0, draw: 1, summary: {} } as any);

    const { result } = renderHook(() => useDashboard());

    expect(result.current.loadingTasks).toBe(true);
    expect(result.current.search).toBe('');
    expect(result.current.page).toBe(1);
    expect(result.current.listingFilters).toEqual(initialListingFilters);
    
    await waitFor(() => {
      expect(result.current.loadingTasks).toBe(false);
    });
  });

  it('fetches data on mount', async () => {
    vi.mocked(dashboardService.getDashboardKPIs).mockResolvedValue({ dueToday: 5 } as any);
    vi.mocked(dashboardService.getDashboardCharts).mockResolvedValue({ completionRate: 80 } as any);
    vi.mocked(dashboardService.getTaskList).mockResolvedValue({ data: [], recordsTotal: 0, draw: 1, summary: {} } as any);

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(result.current.loadingTasks).toBe(false);
    });

    expect(dashboardService.getDashboardKPIs).toHaveBeenCalled();
    expect(dashboardService.getDashboardCharts).toHaveBeenCalled();
    expect(dashboardService.getTaskList).toHaveBeenCalled();
    expect(result.current.summary?.dueToday).toBe(5);
  });
});
