// ─── Dashboard KPI Types ───────────────────────────────────────────────
export interface DashboardSummary {
  dueToday: number;
  overdue: number;
  pending: number;
  completed: number;
  totalAssigned: number;
  user?: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

// ─── Chart Data Types ──────────────────────────────────────────────────
export interface DailyCompletionPoint {
  date: string;
  completed: number;
  created: number;
}

export interface TrendPoint {
  date: string;
  cumulative: number;
}

export interface StatusDistribution {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface DashboardCharts {
  last7Days: DailyCompletionPoint[];
  last30Days: DailyCompletionPoint[];
  trend: TrendPoint[];
  statusDistribution: StatusDistribution[];
}

// ─── Task Table Types ──────────────────────────────────────────────────
export interface Task {
  TaskID: number;
  TaskName: string;
  TaskDescription: string;
  CreatedBy: string;
  ClientName: string;
  ExpectedStartDate: string;
  ExpectedDueDate: string;
  AssignedTo: string;
  Facility: string;
  Status: 'Late' | 'Pending' | 'Completed' | 'Active';
  TaskTypeID: number;
  taskType?: string;
  ClientID?: number;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FacilityStaff {
  Value: number;
  Display: string;
  IsInactive: number;
}

export interface AssignTasksResponse {
  isSuccess: number;
  errorMessage?: string;
  successMessage?: string;
}

// ─── API State ─────────────────────────────────────────────────────────
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface OptionItem {
  value: string | number;
  label: string;
}

export interface DashboardFilters {
  assignedTo: string;
  role: string;
  status: string; // 'all', '0', '1'
  taskType: string;
  startDate: string;
  endDate: string;
}

