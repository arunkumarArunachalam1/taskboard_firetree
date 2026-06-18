import type {
  DashboardSummary,
  DashboardCharts,
  TaskListResponse,
  Task,
} from '../types/dashboard.types';
import type { AppUser } from '../context/AppContext';

let activeContext: AppUser | null = null;

export function setServiceContext(context: AppUser) {
  activeContext = context;
}

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
    { name: 'Pending', value: 21, color: '#F59E0B' },
    { name: 'Overdue', value: 76, color: '#EF4444' },
    { name: 'Due Today', value: 1, color: '#3B82F6' },
  ],
};


// ─── Simulated delay ────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ─── Service Functions ─────────────────────────────────────────────────
// These will eventually call /api/dashboard/* ColdFusion endpoints

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const context = activeContext;

  return {
    ...mockSummary,
    user: context ? {
      firstName: context.firstName || 'User',
      lastName: context.lastName || '',
      role: Object.keys(context.roles || {})[0] || 'Unknown Role'
    } : {
      firstName: 'Local',
      lastName: 'Dev',
      role: 'Developer'
    }
  };
}

export async function getDashboardCharts(): Promise<DashboardCharts> {
  await delay(900);
  // Future: return fetch('/api/dashboard/charts').then(r => r.json());
  return mockCharts;
}

// ─── Constants & Dynamic ID Fetching ──────────────────────────────────────
let cachedTableListingInfo: { id: string, listColumns: string } | null = null;

async function getTableListingInfo(): Promise<{ id: string, listColumns: string }> {
  if (cachedTableListingInfo) return cachedTableListingInfo;

  try {
    const response = await fetch('/ReactTaskBoard/getTableListingIdByName?name=Tasks', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-CSRF-Token': activeContext?.csrfToken || '',
        'X-Requested-With': 'React'
      },
      credentials: 'include'
    });

    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = await response.json();
    if (data.success && data.tableListingID) {
      cachedTableListingInfo = {
        id: data.tableListingID,
        listColumns: data.listColumns || ''
      };
      return cachedTableListingInfo;
    }
    throw new Error(data.error || 'Could not find table listing ID');
  } catch (error) {
    console.error('Failed to dynamically fetch TableListingID, falling back to default:', error);
    // Fallback to the known default in case the API call fails
    return {
      id: 'F50A1C73-CFAA-48A1-AF56-6B1A145C291F',
      listColumns: ''
    };
  }
}

export async function getTaskList(
  page = 1,
  pageSize = 15,
  options: {
    search?: string;
    sortColumn?: number;
    sortDir?: 'asc' | 'desc';
    filters?: Record<string, string>;
  } = {}
): Promise<TaskListResponse> {


  const start = (page - 1) * pageSize;

  // Build DataTables server-side parameters
  let dtParams = `&draw=1&start=${start}&length=${pageSize}`;
  if (options.search) {
    dtParams += `&search[value]=${encodeURIComponent(options.search)}`;
  }
  if (options.sortColumn !== undefined) {
    dtParams += `&order[0][column]=${options.sortColumn}&order[0][dir]=${options.sortDir || 'asc'}`;
  }

  // Pass a default filter (Completed = 0) in the DataTables format.
  // This is required to force ColdFusion to re-evaluate volatile parameters
  // because CORE.cfc skips query preparation if there are no filters.
  const filterParams = `&tableFilters=tableFilter.Completed&tableFilter.Completed=[0][Completed][=][0][]`;

  const tableListingInfo = await getTableListingInfo();
  if (tableListingInfo.listColumns) {
    dtParams += `&listColumns=${encodeURIComponent(tableListingInfo.listColumns)}`;
  }
  const url = `/CORE/retrieveData?tableListingID=${tableListingInfo.id}${dtParams}${filterParams}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-CSRF-Token': activeContext?.csrfToken || '',
        'X-Requested-With': 'React'
      },
      // Credentials 'include' ensures ColdFusion session cookies are sent!
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Your session has timed out or access is denied. Please check your login session.");
      }
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }

    const rawText = await response.text();
    // ColdFusion API might return "Table listing information is not available." instead of JSON if session is missing
    if (rawText.includes("Table listing information is not available")) {
      throw new Error("Table session not initialized. Please visit the legacy Taskboard once to initialize it, or log out and log back in.");
    }

    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      console.error('Failed to parse JSON. Returning empty tasks list. Raw response:', rawText.substring(0, 500) + '...');
      // Return empty data instead of breaking the whole page with an error boundary
      return {
        total: 0,
        page,
        pageSize,
        tasks: []
      };
    }

    // The legacy CF API returns `data` (array of objects) when returnResultsType is "Data" (default)
    // and `aaData` (array of arrays) in older modes. We handle both.
    const rawData = json.data || json.aaData || [];

    console.log("Raw tasks data from API:", rawData.slice(0, 2)); // Log first 2 rows for debugging

    const tasks: Task[] = rawData.map((row: any, idx: number) => {
      // If row is an array, we try to guess indices. If it's an object, we map by Column Labels.
      if (Array.isArray(row)) {
        return {
          TaskID: Number(row[0]) || idx,
          TaskName: row[1] || 'Unknown Task',
          TaskDescription: row[2] || 'No description',
          CreatedBy: row[11] || 'EM System',
          ClientName: row[12] || 'Unknown Client',
          ExpectedStartDate: row[3] || '',
          ExpectedDueDate: row[4] || '',
          AssignedTo: row[13] || 'Unassigned',
          Facility: row[14] || 'Unknown',
          Status: row[16] || 'Active',
          TaskTypeID: Number(row[15]) || 1,
        };
      }

      // If row is an object, the keys are usually the ColdFusion column labels (e.g., 'Task Name', 'Client')
      return {
        TaskID: Number(row['Task ID'] || row['ID'] || row['DT_RowId'] || idx),
        TaskName: row['Task Name'] || row['Task'] || row['TaskName'] || 'Unknown Task',
        TaskDescription: row['Description'] || row['TaskDescription'] || '',
        CreatedBy: row['Created By'] || row['CreatedBy'] || 'EM System',
        ClientName: row['Client'] || row['Client Name'] || row['ClientName'] || 'Unknown Client',
        ExpectedStartDate: row['Exp Start'] || row['Start Date'] || row['ExpectedStartDate'] || '',
        ExpectedDueDate: row['Due'] || row['Due Date'] || row['ExpectedDueDate'] || '',
        AssignedTo: row['Assigned To'] || row['AssignedTo'] || 'Unassigned',
        Facility: row['Facility'] || row['FacilityName'] || 'Unknown',
        Status: row['Status'] || 'Active',
        TaskTypeID: 1, // Default
      };
    });

    return {
      total: json.recordsTotal || json.iTotalRecords || 0,
      page,
      pageSize,
      tasks
    };

  } catch (error) {
    console.error('Error fetching tasks from ColdFusion API:', error);
    // Throw so the React UI layer can show the error gracefully
    throw error;
  }
}

// Helper function to strip HTML tags if ColdFusion sends back fully-formed <a> tags
function extractTextFromHTML(htmlString: string): string {
  if (typeof htmlString !== 'string') return htmlString;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    return (doc.body.textContent || doc.body.innerText || '').trim().replace(/\s+/g, ' ');
  } catch (e) {
    // Fallback regex to strip tags if DOMParser is unsupported
    return htmlString.replace(/<\/?[^>]+(>|$)/g, "").trim().replace(/\s+/g, ' ');
  }
}


export async function setCurrentFacility(facilityId: string | number): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('selectedFacility', String(facilityId));

    const response = await fetch('/Home/setCurrentClientCountFacilityID', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'X-CSRF-Token': activeContext?.csrfToken || '',
        'X-Requested-With': 'React'
      },
      credentials: 'include'
    });

    if (response.ok) {
      window.location.reload();
    } else {
      console.error('Failed to update facility', response.statusText);
    }
  } catch (error) {
    console.error('Error updating facility:', error);
  }
}

