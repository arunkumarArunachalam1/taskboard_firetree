import type {
  DashboardSummary,
  DashboardCharts,
  TaskListResponse,
  Task,
  FacilityStaff,
  AssignTasksResponse,
  DashboardFilters
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
    { name: 'Due in Future', value: 21, color: '#F59E0B' },
    { name: 'Overdue', value: 76, color: '#EF4444' },
    { name: 'Due Today', value: 1, color: '#3B82F6' },
  ],
};


// ─── Helpers ─────────────────────────────────────────────────────────────
export async function safeJsonParse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    // Log the actual text that failed to parse so we can see what ColdFusion sent back
    console.error("JSON Parse Error. Server responded with:", text.substring(0, 1000) + (text.length > 1000 ? "..." : ""));
    
    // Return an error object instead of throwing to prevent aggressive UI popups
    return { error: true, message: 'Invalid JSON response from server or session expired.' };
  }
}
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
      firstName: '',
      lastName: '',
      role: ''
    }
  };
}

export async function getDashboardKPIs(): Promise<DashboardSummary> {
  const context = activeContext;
  const url = `/ReactTaskBoard/getDashboardKPIs?_=${Date.now()}`;
  console.log(`[getDashboardKPIs] Fetching KPIs from: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });

  console.log(`[getDashboardKPIs] Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorMsg = `Request failed with status ${response.status}: ${response.statusText}`;
    console.error(`[getDashboardKPIs] HTTP Error:`, errorMsg);
    throw new Error(errorMsg);
  }

  let json;
  try {
    json = await safeJsonParse(response);
    console.log(`[getDashboardKPIs] Raw JSON response:`, json);

    if (json.error) {
      console.error(`[getDashboardKPIs] API Error returned in JSON:`, json.message || 'Error fetching KPI data', json);
      // Don't throw, just use fallback data to prevent UI error message
      json = {}; 
    }
  } catch (e) {
    console.error(`[getDashboardKPIs] Failed to parse response`, e);
    json = {};
  }

  const kpiData = {
    dueToday: json.dueToday || 0,
    overdue: json.overdue || 0,
    pending: json.dueInFuture || 0,
    completed: json.completed || 0,
    totalAssigned: json.totalAssigned || 0,
    user: context ? {
      firstName: context.firstName || 'User',
      lastName: context.lastName || '',
      role: Object.keys(context.roles || {})[0] || 'Unknown Role'
    } : {
      firstName: '',
      lastName: '',
      role: ''
    }
  };

  console.log(`[getDashboardKPIs] Parsed KPI Data returning to UI:`, kpiData);
  return kpiData;
}

export async function getDashboardCharts(): Promise<DashboardCharts> {
  const url = `/ReactTaskBoard/getDashboardCharts?_=${Date.now()}`;
  console.log(`[getDashboardCharts] Fetching Charts from: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-CSRF-Token': activeContext?.csrfToken || '',
        'X-Requested-With': 'React'
      },
      credentials: 'include'
    });

    console.log(`[getDashboardCharts] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
    }

    const json = await safeJsonParse(response);
    console.log(`[getDashboardCharts] Raw JSON response:`, json);

    if (json.error) {
      console.error(`[getDashboardCharts] API Error:`, json.message || 'Error fetching chart data');
      // Return empty data instead of throwing to prevent UI error popups
      return {
        last7Days: [],
        last30Days: [],
        trend: [],
        statusDistribution: []
      };
    }

    // Map the ColdFusion response to our TypeScript types
    const chartsData: DashboardCharts = {
      last7Days: Array.isArray(json.last7Days) ? json.last7Days : [],
      last30Days: Array.isArray(json.last30Days) ? json.last30Days : [],
      trend: Array.isArray(json.trend) ? json.trend : [],
      statusDistribution: Array.isArray(json.statusDistribution) ? json.statusDistribution : [],
    };

    console.log(`[getDashboardCharts] Parsed chart data:`, {
      last7Days: chartsData.last7Days.length,
      last30Days: chartsData.last30Days.length,
      trend: chartsData.trend.length,
      statusDistribution: chartsData.statusDistribution.length,
    });

    return chartsData;
  } catch (err: any) {
    console.error(`[getDashboardCharts] Failed:`, err.message);
    // Return empty data instead of throwing error to screen
    return {
      last7Days: [],
      last30Days: [],
      trend: [],
      statusDistribution: []
    };
  }
}

export async function triggerHardRefresh(): Promise<boolean> {
  const url = `/ReactTaskBoard/HardRefresh?_=${Date.now()}`;
  console.log(`[triggerHardRefresh] Hitting endpoint: ${url}`);
  
  const response = await fetch(url, {
    method: 'POST', // using POST for a mutative action like cache clearing
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Failed to hard refresh: ${response.statusText}`);
  }

  // The backend might return JSON or just 200 OK.
  // We'll just return true if no error thrown.
  return true;
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

    const data = await safeJsonParse(response);
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
    filters?: DashboardFilters;
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

  let filterParams = '';
  const filterKeys: string[] = [];
  const filterValues: string[] = [];

  const filters = options.filters;

  if (filters) {
    if (filters.status === '0' || filters.status === '1') {
      filterKeys.push('Completed');
      filterValues.push(`tableFilter.Completed=${encodeURIComponent(`[0][Completed][=][${filters.status}][]`)}`);
    } else if (filters.status === 'all') {
      // Dummy filter to force query prepare if 'all' is selected
      filterKeys.push('TaskID');
      filterValues.push(`tableFilter.TaskID=${encodeURIComponent(`[0][TaskID][>][0][]`)}`);
    }

    if (filters.assignedTo) {
      filterKeys.push('AssignedTo');
      filterValues.push(`tableFilter.AssignedTo=${encodeURIComponent(`[0][AssignedTo][=][${filters.assignedTo}][]`)}`);
    }

    if (filters.role) {
      filterKeys.push('RoleID');
      filterValues.push(`tableFilter.RoleID=${encodeURIComponent(`[0][RoleID][=][${filters.role}][]`)}`);
    }

    if (filters.taskType) {
      filterKeys.push('TaskTypeID');
      filterValues.push(`tableFilter.TaskTypeID=${encodeURIComponent(`[0][TaskTypeID][=][${filters.taskType}][]`)}`);
    }

    const formatToCFDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}/${parts[0]}`;
      }
      return dateStr;
    };

    if (filters.startDate) {
      filterKeys.push('StartDate');
      filterValues.push(`tableFilter.StartDate=${encodeURIComponent(`[5][Start Date][=][${formatToCFDate(filters.startDate)}][${formatToCFDate(filters.startDate)}]`)}`);
    }

    if (filters.endDate) {
      filterKeys.push('EndDate');
      filterValues.push(`tableFilter.EndDate=${encodeURIComponent(`[6][End Date][=][${formatToCFDate(filters.endDate)}][${formatToCFDate(filters.endDate)}]`)}`);
    }
  } else {
    // Default filter for backwards compatibility
    filterKeys.push('Completed');
    filterValues.push(`tableFilter.Completed=${encodeURIComponent(`[0][Completed][=][0][]`)}`);
  }

  if (filterKeys.length > 0) {
    filterParams = `&tableFilters=${filterKeys.map(k => `tableFilter.${k}`).join(',')}&${filterValues.join('&')}`;
  }

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

    // Trace if our test task is in the retrieved tasks
    const testTask = tasks.find(t => t.TaskName === 'React Taskboard Redirect Test' || t.TaskDescription.includes('/ReactTaskBoard/testPage'));
    if (testTask) {
      fetch(`/ReactTaskBoard/logEvent?event=TaskRetrieval&taskID=${testTask.TaskID}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-Token': activeContext?.csrfToken || '',
          'X-Requested-With': 'React'
        },
        credentials: 'include'
      }).catch(err => console.error('[Taskboard Redirect Test] Failed to log retrieval:', err));
    }

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
export function extractTextFromHTML(htmlString: string): string {
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

// Helper function to extract href attribute from HTML strings
export function extractHrefFromHTML(htmlString: string): string | null {
  if (typeof htmlString !== 'string' || !htmlString) return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const firstAnchor = doc.querySelector('a');
    return firstAnchor ? firstAnchor.getAttribute('href') : null;
  } catch (e) {
    // Fallback regex if DOMParser is unavailable or fails
    const match = htmlString.match(/<a\s+[^>]*href=["']([^"']*)["']/i);
    return match ? match[1] : null;
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
      // If the URL has a FacilityID param (used by legacy dropdown), we must update it
      // so the legacy dropdown reflects the new facility upon reload.
      const url = new URL(window.location.href);
      if (url.searchParams.has('FacilityID')) {
        url.searchParams.set('FacilityID', String(facilityId));
        window.location.href = url.toString();
      } else {
        window.location.reload();
      }
    } else {
      console.error('Failed to update facility', response.statusText);
    }
  } catch (error) {
    console.error('Error updating facility:', error);
  }
}

export interface MarkTasksResponse {
  isSuccess: number;
  errorMessage?: string;
  successMessage?: string;
}

export async function markTasksCompleted(taskIds: number[]): Promise<MarkTasksResponse> {
  const idsStr = taskIds.join(',');
  const response = await fetch(`/ReactTaskBoard/MarkTasksCompleted?listids=${encodeURIComponent(idsStr)}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  const rawText = await response.text();
  try {
    const json = JSON.parse(rawText);
    return {
      isSuccess: json.isSuccess !== undefined ? Number(json.isSuccess) : (json.ISSUCCESS !== undefined ? Number(json.ISSUCCESS) : 0),
      errorMessage: json.errorMessage || json.ERRORMESSAGE || '',
      successMessage: json.successMessage || json.SUCCESSMESSAGE || ''
    };
  } catch (e) {
    throw new Error(`Failed to parse server response: ${rawText}`);
  }
}

// ─── ColdFusion Query Parser Helper ──────────────────────────────────────────
export function parseCFQuery<T>(json: any): T[] {
  if (!json) return [];
  if (typeof json === 'string') {
    try {
      json = JSON.parse(json);
    } catch (e) {
      console.warn("Failed to parse string in parseCFQuery:", e);
      return [];
    }
  }
  if (Array.isArray(json)) return json as T[];

  // Standard CF serialization maps a query object to:
  // { COLUMNS: ["COL1", "COL2"], DATA: [["Val1", "Val2"], ["Val3", "Val4"]] }
  if (json.COLUMNS && json.DATA) {
    const cols = json.COLUMNS.map((c: string) => c.toUpperCase());
    return json.DATA.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((col: string, i: number) => {
        obj[col] = row[i];
        // Map common properties case-sensitively or camelCase for ease of use
        const camel = col.charAt(0) + col.slice(1).toLowerCase();
        obj[camel] = row[i];
        obj[col.toLowerCase()] = row[i];
      });
      return obj as T;
    });
  }
  return [];
}

// ─── Reassignment Services ──────────────────────────────────────────────────
export async function getFacilityStaff(facilityId?: string | number): Promise<FacilityStaff[]> {
  const url = facilityId ? `/ReactTaskBoard/GetCurrentlySelectedFacilityStaff?facilityID=${facilityId}` : '/ReactTaskBoard/GetCurrentlySelectedFacilityStaff';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  const json = await safeJsonParse(response);
  return parseCFQuery<FacilityStaff>(json);
}

export async function getTaskTypes(): Promise<{ value: string | number; label: string }[]> {
  const response = await fetch('/ReactTaskBoard/GetTaskTypes', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  const json = await safeJsonParse(response);
  return parseCFQuery<{ value: string | number; label: string }>(json);
}

export async function getRoles(): Promise<{ value: string | number; label: string }[]> {
  const response = await fetch('/ReactTaskBoard/GetRoles', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  const json = await safeJsonParse(response);
  return parseCFQuery<{ value: string | number; label: string }>(json);
}

export interface ClientOption {
  value: string | number; // ClientCaseFileID
  label: string;
  clientId?: string | number; // Actual ClientID
}

export async function getClientList(facilityId?: string | number): Promise<ClientOption[]> {
  const url = facilityId ? `/ReactTaskBoard/GetClientList?facilityID=${facilityId}` : '/ReactTaskBoard/GetClientList';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  const json = await safeJsonParse(response);
  return parseCFQuery<ClientOption>(json);
}

export async function saveGeneralTask(payload: FormData): Promise<any> {
  const response = await fetch('/ReactTaskBoard/SaveGeneralTask', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include',
    body: payload
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  const rawText = await response.text();
  try {
    return JSON.parse(rawText);
  } catch (e) {
    throw new Error(`Failed to parse server response: ${rawText}`);
  }
}

export async function assignTasks(taskIds: number[], assignedToId: number | string): Promise<AssignTasksResponse> {
  const formData = new FormData();
  formData.append('Task.listids', taskIds.join(','));
  formData.append('Task.AssignedTo', String(assignedToId));

  const response = await fetch('/ReactTaskBoard/AssignTasks', {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  const rawText = await response.text();
  try {
    const json = JSON.parse(rawText);
    return {
      isSuccess: json.isSuccess !== undefined ? Number(json.isSuccess) : (json.ISSUCCESS !== undefined ? Number(json.ISSUCCESS) : 0),
      errorMessage: json.errorMessage || json.ERRORMESSAGE || '',
      successMessage: json.successMessage || json.SUCCESSMESSAGE || ''
    };
  } catch (e) {
    throw new Error(`Failed to parse server response: ${rawText}`);
  }
}

// ─── Whereabouts Task Services ──────────────────────────────────────────────────

let formBindingUUIDs: { destinationsUUID: string; staffUUID: string } | null = null;

export async function getFormBindingUUIDs(): Promise<{ destinationsUUID: string; staffUUID: string }> {
  if (formBindingUUIDs) return formBindingUUIDs;

  const response = await fetch('/ReactTaskBoard/GetFormBindingUUIDs', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch form binding UUIDs: ${response.statusText}`);
  }

  const json = await safeJsonParse(response);
  formBindingUUIDs = json;
  return formBindingUUIDs!;
}

export async function getCurrentlySelectedFacilityStaff(): Promise<{ Value: string; Display: string }[]> {
  const uuids = await getFormBindingUUIDs();
  const response = await fetch(`/CORE/getFormBindingData?formDetailID=${uuids.staffUUID}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch staff');
  const json = await safeJsonParse(response);
  return Array.isArray(json) ? json : parseCFQuery(json);
}

export async function getClientEventDestinations(clientId: string | number): Promise<{ value: string; label: string }[]> {
  const uuids = await getFormBindingUUIDs();
  const response = await fetch(`/CORE/getFormBindingData?formDetailID=${uuids.destinationsUUID}&boundValue=${clientId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });
  if (!response.ok) throw new Error(`Failed to fetch destinations`);
  const json = await safeJsonParse(response);
  const parsed = Array.isArray(json) ? json : parseCFQuery(json);

  // Map 'str_descriptor' or 'display' to 'label' for the React component
  return parsed.map((item: any) => ({
    value: item.value ?? item.VALUE ?? item.Value ?? 0,
    label: item.display ?? item.DISPLAY ?? item.Display ?? item.label ?? item.str_descriptor ?? 'Unknown Destination',
    clientId: item.CLIENTID ?? item.ClientID ?? item.clientId ?? 0
  }));
}

export async function getClientContacts(clientId: string | number): Promise<{ value: string; label: string; phone: string }[]> {
  const response = await fetch(`/ReactTaskBoard/GetClientContacts?clientID=${clientId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });
  if (!response.ok) throw new Error(`Failed to fetch contacts`);
  const json = await safeJsonParse(response);
  return Array.isArray(json) ? json : parseCFQuery(json);
}

export async function getContactPhoneNumbers(destinationId: string | number): Promise<{ value: string; label: string }[]> {
  const response = await fetch(`/ReactTaskBoard/GetContactPhoneNumbers?calendarClientWorkEventDestinationID=${destinationId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });
  if (!response.ok) throw new Error(`Failed to fetch contact phone numbers`);
  const json = await safeJsonParse(response);
  return Array.isArray(json) ? json : parseCFQuery(json);
}

export async function getContactMethods(): Promise<{ value: string; label: string }[]> {
  const response = await fetch(`/ReactTaskBoard/GetContactMethods`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include'
  });
  if (!response.ok) throw new Error(`Failed to fetch contact methods`);
  const json = await safeJsonParse(response);
  return Array.isArray(json) ? json : parseCFQuery(json);
}

export async function saveWhereaboutsTask(payload: any): Promise<{ isSuccess: number; successMessage?: string; errorMessage?: string }> {
  const formData = new FormData();
  formData.append('ClientEmploymentContactSchedule.ClientID', String(payload.clientId));
  formData.append('ClientEmploymentContactSchedule.EmploymentScheduleContactTypeID', String(payload.methodId));
  formData.append('ClientEmploymentContactSchedule.ExpectedStartDate', payload.expectedStartDate);
  formData.append('ClientEmploymentContactSchedule.ContactTimeStart', payload.expectedStartTime);
  formData.append('ClientEmploymentContactSchedule.ExpectedEndDate', payload.expectedEndDate);
  formData.append('ClientEmploymentContactSchedule.ContactTimeEnd', payload.expectedEndTime);
  formData.append('ClientEmploymentContactSchedule.CalendarClientWorkEventDestinationID', String(payload.destinationId));
  formData.append('ClientEmploymentContactSchedule.ContactID', String(payload.contactId));

  if (payload.contactPhoneNumberId) {
    formData.append('ClientEmploymentContactSchedule.ContactPhoneNumberID', String(payload.contactPhoneNumberId));
  }

  if (payload.assignedTo) {
    formData.append('ClientEmploymentContactSchedule.AssignTo', String(payload.assignedTo));
  }

  const response = await fetch('/ReactTaskBoard/SaveWhereaboutsTask', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'X-CSRF-Token': activeContext?.csrfToken || '',
      'X-Requested-With': 'React'
    },
    credentials: 'include',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
  }

  const rawText = await response.text();
  try {
    const json = JSON.parse(rawText);
    return {
      isSuccess: json.isSuccess !== undefined ? Number(json.isSuccess) : (json.ISSUCCESS !== undefined ? Number(json.ISSUCCESS) : 0),
      errorMessage: json.errorMessage || json.ERRORMESSAGE || '',
      successMessage: json.successMessage || json.SUCCESSMESSAGE || ''
    };
  } catch (e) {
    throw new Error(`Failed to parse server response: ${rawText}`);
  }
}
