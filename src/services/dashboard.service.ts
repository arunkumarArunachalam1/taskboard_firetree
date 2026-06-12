import type {
  DashboardSummary,
  DashboardCharts,
  TaskListResponse,
} from '../types/dashboard.types';

// ─── Mock Data ─────────────────────────────────────────────────────────
const mockSummary: DashboardSummary = {
  dueToday: 1,
  overdue: 76,
  pending: 21,
  completed: 22,
  totalAssigned: 120,
};

const last7Days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    completed: Math.floor(Math.random() * 18) + 2,
    created: Math.floor(Math.random() * 12) + 4,
  };
});

const last30Days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    completed: Math.floor(Math.random() * 18) + 2,
    created: Math.floor(Math.random() * 14) + 3,
  };
});

const mockCharts: DashboardCharts = {
  last7Days,
  last30Days,
  trend: Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cumulative: (i + 1) * Math.floor(Math.random() * 5 + 3),
    };
  }),
  statusDistribution: [
    { name: 'Completed', value: 22, color: '#10B981' },
    { name: 'Pending',   value: 21, color: '#F59E0B' },
    { name: 'Overdue',   value: 76, color: '#EF4444' },
    { name: 'Due Today', value: 1,  color: '#3B82F6' },
  ],
};

const mockTasks: TaskListResponse = {
  total: 120,
  page: 1,
  pageSize: 25,
  tasks: Array.from({ length: 25 }, (_, i) => ({
    TaskID: i + 1,
    TaskName: ['Aftercare Followup', '7-Day Followup', 'Medication Review', 'Discharge Planning', 'Wellness Check'][i % 5],
    TaskDescription: 'Review patient status and update care plan accordingly.',
    CreatedBy: ['Dr. Smith', 'Dr. Patel', 'Nurse Johnson'][i % 3],
    ClientName: ['Alice Martin', 'Bob Torres', 'Carol Lee', 'David Kim', 'Emma Davis'][i % 5],
    ExpectedStartDate: new Date(Date.now() - i * 86400000 * 2).toLocaleDateString('en-US'),
    ExpectedDueDate: new Date(Date.now() + (i % 7) * 86400000).toLocaleDateString('en-US'),
    AssignedTo: ['Dr. Smith', 'Dr. Patel', 'Nurse Johnson', 'Case Manager Rivera'][i % 4],
    Facility: ['Main Campus', 'North Wing', 'South Outpatient'][i % 3],
    Status: (['Active', 'Late', 'Pending', 'Completed'] as const)[i % 4],
    TaskTypeID: (i % 3) + 1,
  })),
};

// ─── Simulated delay ────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ─── Service Functions ─────────────────────────────────────────────────
// These will eventually call /api/dashboard/* ColdFusion endpoints

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const response = await fetch('/Taskboard/GetDashboardKPIs', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch KPI summary: ${response.statusText}`);
    }

    const json = await response.json();
    
    if (json.isSuccess && json.data) {
      return {
        dueToday: json.data.dueToday,
        overdue: json.data.overdue,
        pending: json.data.pending,
        completed: json.data.completed,
        totalAssigned: json.data.totalAssigned,
        user: json.data.user
      };
    } else {
      console.warn('Backend returned failure or no data, falling back to mock KPIs', json.errorMessage);
      return mockSummary;
    }

  } catch (error) {
    console.error('Error fetching KPIs from ColdFusion API:', error);
    // Fallback to mock data if there's an error so UI doesn't break
    return mockSummary;
  }
}

export async function getDashboardCharts(): Promise<DashboardCharts> {
  await delay(900);
  // Future: return fetch('/api/dashboard/charts').then(r => r.json());
  return mockCharts;
}

// ─── Constants ─────────────────────────────────────────────────────────
// IMPORTANT: Replace this with the actual tableListingID UUID for "Tasks"
const TABLE_LISTING_ID = 'YOUR_TABLE_LISTING_ID_HERE';

export async function getTaskList(
  page = 1,
  pageSize = 25,
  filters: Record<string, string> = {}
): Promise<TaskListResponse> {
  // If no table listing ID is provided, return mock data for now
  if (TABLE_LISTING_ID === 'YOUR_TABLE_LISTING_ID_HERE') {
    console.warn('TABLE_LISTING_ID is not set. Returning mock data.');
    await delay(800);
    return { ...mockTasks, page, pageSize };
  }

  const start = (page - 1) * pageSize;
  const url = `/CORE/retrieveData?tableListingID=${TABLE_LISTING_ID}&start=${start}&length=${pageSize}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // Credentials 'include' ensures ColdFusion session cookies are sent!
      credentials: 'include' 
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }

    const json = await response.json();
    
    // The legacy DataTables API returns { iTotalRecords: number, iTotalDisplayRecords: number, aaData: any[][] }
    // We map the raw array data (aaData) back to our React object structure.
    // NOTE: The exact column indices [0], [1], etc. will depend on your ColdFusion CORE_Table_Listing_Column sequence!
    // The mapping below is an educated guess based on standard DataTables implementation.
    
    const tasks: Task[] = (json.aaData || []).map((row: any[], index: number) => ({
      TaskID: index + start, // Assuming ID is not easily accessible or is part of a link
      TaskName: extractTextFromHTML(row[1] || 'Unknown Task'),
      TaskDescription: row[2] || 'No description',
      CreatedBy: 'EM System',
      ClientName: row[3] || 'Unknown Client',
      ExpectedStartDate: row[4] || '',
      ExpectedDueDate: row[5] || '',
      AssignedTo: row[6] || 'Unassigned',
      Facility: row[7] || 'Unknown',
      Status: row[8] && row[8].includes('Late') ? 'Late' : 'Active',
      TaskTypeID: 1,
    }));

    return {
      total: json.iTotalRecords || 0,
      page,
      pageSize,
      tasks
    };

  } catch (error) {
    console.error('Error fetching tasks from ColdFusion API:', error);
    // Fallback to mock data if there's an error so the UI doesn't completely break during dev
    return { ...mockTasks, page, pageSize };
  }
}

// Helper function to strip HTML tags if ColdFusion sends back fully-formed <a> tags
function extractTextFromHTML(htmlString: string): string {
  if (typeof htmlString !== 'string') return htmlString;
  const tmp = document.createElement('DIV');
  tmp.innerHTML = htmlString;
  return tmp.textContent || tmp.innerText || '';
}
