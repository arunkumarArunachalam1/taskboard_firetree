// ─── Dashboard KPI Types ───────────────────────────────────────────────
export interface DashboardSummary {
  dueToday: number;
  overdue: number;
  pending: number;
  completed: number;
  totalAssigned: number;
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
  color: string;
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
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── API State ─────────────────────────────────────────────────────────
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
