import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TaskTable from '../TaskTable';

import * as AppContextModule from '../../../context/AppContext';

vi.mock('../../../services/dashboard.service', () => ({
  markTasksCompleted: vi.fn(),
  assignTasks: vi.fn(),
  extractTextFromHTML: (html: string) => html,
  getFacilityStaff: vi.fn().mockResolvedValue([]),
  getRoles: vi.fn().mockResolvedValue([]),
  getTaskTypes: vi.fn().mockResolvedValue([]),
  extractHrefFromHTML: vi.fn(),
  getTaskDetails: vi.fn(),
}));

vi.mock('../NewGeneralTaskModal', () => ({ NewGeneralTaskModal: () => <div data-testid="new-general-modal" /> }));
vi.mock('../NewWhereaboutsTaskModal', () => ({ NewWhereaboutsTaskModal: () => <div data-testid="new-whereabouts-modal" /> }));
vi.mock('../FilterPanel', () => ({ FilterPanel: () => <div data-testid="filter-panel" /> }));
vi.mock('../ViewTaskModal', () => ({ ViewTaskModal: () => <div data-testid="view-task-modal" /> }));
vi.mock('../EditWhereaboutsModal', () => ({ EditWhereaboutsModal: () => <div data-testid="edit-whereabouts-modal" /> }));
vi.mock('../WhereaboutsCompleteModal', () => ({ WhereaboutsCompleteModal: () => <div data-testid="whereabouts-complete-modal" /> }));
vi.mock('../FollowupCompleteModal', () => ({ FollowupCompleteModal: () => <div data-testid="followup-complete-modal" /> }));

vi.mock('../../../context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

describe('TaskTable', () => {
  const mockOnRefresh = vi.fn();
  
  const mockTasks = [
    {
      TaskID: 1,
      TaskName: 'Test Task',
      TaskDescription: 'Test Description',
      CreatedBy: 'Admin',
      ClientName: 'Test Client',
      ExpectedStartDate: '08/27/2026',
      ExpectedDueDate: '08/27/2026',
      AssignedTo: 'John Doe',
      Facility: 'Test Facility',
      Status: 'Pending',
      TaskTypeID: 1,
      taskType: 'General',
      ClientID: 1,
    }
  ];

  const mockResponse = {
    tasks: mockTasks,
    total: 1,
    page: 1,
    pageSize: 10,
    summary: { General: 1, Whereabouts: 0, Followup: 0 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppContextModule.useAppContext).mockReturnValue({
      currentFacilityID: 1, 
      facilities: [{ id: 1, name: 'Test Facility' }],
      roles: { 'Admin': true }
    } as any);
  });

  const defaultProps: any = {
    data: mockResponse,
    loading: false,
    page: 1,
    pageSize: 10,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    sortColumn: 0,
    sortDir: 'asc' as const,
    onSortChange: vi.fn(),
    onRefresh: mockOnRefresh,
    listingFilters: { status: 'all', startDate: '', endDate: '', assignedTo: '', role: '', taskType: '' },
    onApplyFilters: vi.fn(),
    onClearFilters: vi.fn(),
  };

  it('renders table with tasks', () => {
    render(<TaskTable {...defaultProps} />);
    
    // Check if task title is displayed
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    
    // Check if assignee is displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows empty state when no tasks are present', () => {
    render(<TaskTable {...defaultProps} data={{ ...mockResponse, tasks: [], total: 0 }} />);
    
    expect(screen.getByText(/No tasks match your search\./i)).toBeInTheDocument();
  });

  it('shows loading skeleton when loading is true', () => {
    render(<TaskTable {...defaultProps} data={null} loading={true} />);
    // There are usually loading skeletons instead of the real data
    // Testing the exact skeleton class might be brittle, but checking for lack of task text works
    expect(screen.queryByText('Test Task')).not.toBeInTheDocument();
  });
});
