import React from 'react';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TaskListResponse } from '../../types/dashboard.types';

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return '??';
};

const getAvatarColor = (name: string) => {
  const colors = ['#22C55E', '#8B5CF6', '#3B82F6', '#F59E0B', '#EC4899', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const TableSkeleton: React.FC = () => (
  <div className="table-card">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
        <div className="skeleton" style={{ height: 20, width: '100%' }} />
      </div>
    ))}
  </div>
);

interface TaskTableProps {
  data: TaskListResponse | null;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
}

const TaskTable: React.FC<TaskTableProps> = ({ data, loading, page, onPageChange }) => {
  if (loading || !data) return <TableSkeleton />;

  const totalPages = Math.ceil(data.total / data.pageSize);

  return (
    <div className="table-card">
      <div className="table-scroll">
        <table className="task-table">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Task Name</th>
              <th style={{ minWidth: 280 }}>Description</th>
              <th style={{ minWidth: 140 }}>Created By</th>
              <th style={{ minWidth: 180 }}>Client</th>
              <th style={{ minWidth: 100 }}>Exp Start</th>
              <th style={{ minWidth: 100 }}>Due</th>
              <th style={{ minWidth: 140 }}>Assigned To</th>
              <th style={{ minWidth: 150 }}>Facility</th>
              <th style={{ width: 80, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.tasks.map((task, i) => (
              <tr key={task.TaskID}>
                <td>
                  <span className="task-name-link cursor-pointer">
                    {task.TaskName}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {i % 2 !== 0 && (
                      <span className="task-icon"><FileText size={15} color="#EF4444" /></span>
                    )}
                    <span style={{ color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                      {task.TaskDescription}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="created-by-main">EM System</div>
                  <div className="created-by-sub">SYSTEM</div>
                </td>
                <td>
                  <div className="client-cell">
                    <div className="client-avatar" style={{ background: getAvatarColor(task.ClientName) }}>
                      {getInitials(task.ClientName)}
                    </div>
                    <span className="client-name">{task.ClientName}</span>
                  </div>
                </td>
                <td style={{ color: '#6B7280' }}>{task.ExpectedStartDate}</td>
                <td style={{ color: task.Status === 'Late' ? '#EF4444' : '#111827', fontWeight: task.Status === 'Late' ? 600 : 500 }}>
                  {task.ExpectedDueDate}
                </td>
                <td style={{ color: '#4B5563', fontWeight: 500 }}>{task.AssignedTo}</td>
                <td style={{ color: '#4B5563' }}>{task.Facility}</td>
                <td style={{ textAlign: 'center' }}>
                  <input type="radio" className="action-radio" name={`action_${task.TaskID}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination matching design */}
      <div className="pagination">
        <span className="page-info">
          Showing <strong>{(page - 1) * data.pageSize + 1}</strong> to <strong>{Math.min(page * data.pageSize, data.total)}</strong> of <strong>{data.total}</strong>
        </span>
        <div className="page-btns">
          <button
            className="page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                className={`page-btn ${page === p ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            );
          })}

          <button
            className="page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskTable;
