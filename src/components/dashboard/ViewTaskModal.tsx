import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  CalendarDays,
  UserRound,
  History,
  FileText,
  CircleCheck,
  ClipboardList
} from 'lucide-react';
import { getTaskDetails } from '../../services/dashboard.service';

interface ViewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number | null;
}

export const ViewTaskModal: React.FC<ViewTaskModalProps> = ({ isOpen, onClose, taskId }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const extractTaskData = (rawRes: any): any => {
    if (!rawRes) return null;
    let obj = rawRes;
    if (typeof obj === 'string') {
      try { obj = JSON.parse(obj); } catch (e) { return null; }
    }
    // Check for ColdFusion Query JSON serialization format: { COLUMNS: [...], DATA: [[...]] }
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const cols = obj.COLUMNS || obj.columns;
      const rows = obj.DATA || obj.data;
      if (Array.isArray(cols) && Array.isArray(rows) && rows.length > 0) {
        if (Array.isArray(rows[0])) {
          const rowObj: Record<string, any> = {};
          cols.forEach((col: string, i: number) => {
            rowObj[col] = rows[0][i];
          });
          return rowObj;
        }
      }
    }
    // Check for wrapper properties (data, DATA, result, RESULT, task, TASK, item, ITEM, payload, PAYLOAD)
    const wrapperKeys = ['data', 'DATA', 'result', 'RESULT', 'task', 'TASK', 'item', 'ITEM', 'payload', 'PAYLOAD', 'taskDetails', 'TaskDetails'];
    for (let i = 0; i < 4; i++) {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        let unwrapped = false;
        for (const wk of wrapperKeys) {
          if (wk in obj && obj[wk] !== undefined && obj[wk] !== null) {
            const val = obj[wk];
            if (typeof val === 'object') {
              obj = val;
              unwrapped = true;
              break;
            }
          }
        }
        if (!unwrapped) break;
      } else {
        break;
      }
    }
    if (Array.isArray(obj)) {
      obj = obj.length > 0 ? obj[0] : null;
    }
    return obj;
  };

  useEffect(() => {
    if (isOpen && taskId) {
      setLoading(true);
      setError(null);
      getTaskDetails(taskId)
        .then((res) => {
          console.log('RAW API RES:', JSON.stringify(res, null, 2));
          const taskObj = extractTaskData(res);
          console.log('EXTRACTED TASK OBJ:', JSON.stringify(taskObj, null, 2));
          if (taskObj) {
            setData(taskObj);
          } else {
            setError(res?.errorMessage || 'Failed to load task details.');
          }
        })
        .catch((err) => {
          setError(err.message || 'Error fetching task details.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, taskId]);

  if (!isOpen) return null;

  const getProp = (obj: any, ...keys: string[]): any => {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const key of keys) {
      if (key in obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      const strippedKey = lowerKey.replace(/[^a-z0-9]/g, '');
      for (const k of Object.keys(obj)) {
        const lowerK = k.toLowerCase();
        const strippedK = lowerK.replace(/[^a-z0-9]/g, '');
        if (lowerK === lowerKey || strippedK === strippedKey) {
          if (obj[k] !== undefined && obj[k] !== null) {
            return obj[k];
          }
        }
      }
    }
    return undefined;
  };

  const getTaskName = () => {
    const n = getProp(data, 'TaskName', 'Name', 'taskName', 'name', 'Title', 'task_name');
    if (n !== undefined && n !== null && String(n).trim() !== '') {
      return String(n);
    }
    return '--';
  };

  const getDescription = () => {
    const descVal = getProp(data, 'TaskDescription', 'Description', 'taskDescription', 'task_description');
    const commVal = getProp(data, 'Comments', 'Comment', 'comments', 'comment');
    const desc = descVal !== undefined && descVal !== null ? String(descVal).trim() : '';
    const comm = commVal !== undefined && commVal !== null ? String(commVal).trim() : '';
    if (desc && desc !== '' && desc.toLowerCase() !== 'unassigned' && desc !== '--') return desc;
    if (comm && comm !== '' && comm.toLowerCase() !== 'unassigned' && comm !== '--') return comm;
    return '--';
  };

  const renderDescription = () => {
    const rawDesc = getDescription();
    if (rawDesc === '--') return '--';

    if (rawDesc.includes('<a ')) {
      let fixedDesc = rawDesc.replace(/class=["'][^"']*["']/ig, '');
      fixedDesc = fixedDesc.replace(/<a /ig, '<br/><br/><a class="vt-btn-primary" style="display: inline-flex; width: fit-content; text-decoration: none; margin-top: 4px;" target="_blank" rel="noopener noreferrer" ');
      return <div dangerouslySetInnerHTML={{ __html: fixedDesc }} />;
    }

    return <div dangerouslySetInnerHTML={{ __html: rawDesc }} />;
  };

  const getClientName = () => {
    const c = getProp(data, 'ClientName', 'Client', 'clientName', 'client', 'ClientDisplay', 'client_name');
    if (c !== undefined && c !== null && String(c).trim() !== '' && String(c).trim().toLowerCase() !== 'unassigned') {
      return String(c);
    }
    return '--';
  };

  const getStartDate = () => {
    const d = getProp(data, 'ExpectedStartDate', 'StartDate', 'expectedStartDate', 'expected_start_date', 'start_date', 'ExpectedStart');
    if (d !== undefined && d !== null && String(d).trim() !== '' && String(d).trim() !== '--') {
      return String(d);
    }
    return '--';
  };

  const getDueDate = () => {
    const d = getProp(data, 'ExpectedDueDate', 'DueDate', 'expectedDueDate', 'expected_due_date', 'due_date', 'ExpectedDue');
    if (d !== undefined && d !== null && String(d).trim() !== '' && String(d).trim() !== '--') {
      return String(d);
    }
    return '--';
  };

  const getCompletedDate = () => {
    const d = getProp(data, 'CompletedDateTime', 'CompletedDate', 'Completed', 'completedDateTime', 'completedDate', 'completed', 'CompletedTime', 'completed_date_time');
    if (d !== undefined && d !== null && String(d).trim() !== '' && String(d).trim() !== '--' && String(d).trim() !== 'N/A') {
      return String(d);
    }
    return 'N/A';
  };

  const getAssignmentHistory = () => {
    const history = getProp(data, 'assignmentHistory', 'AssignmentHistory', 'history', 'History', 'assignment_history');
    if (Array.isArray(history) && history.length > 0) {
      return (
        <div className="vt-history-timeline">
          {history.map((item: any, idx: number) => {
            const who = getProp(item, 'AssignedToDisplay', 'AssignedTo', 'assignedToDisplay', 'assignedTo', 'AssignedName', 'who', 'User') || 'N/A';
            const when = getProp(item, 'UpdateDate', 'Date', 'updateDate', 'date', 'timestamp', 'when');
            return (
              <div key={idx} className="vt-history-entry">
                <div className="vt-history-dot" />
                <div className="vt-history-body">
                  <div className="vt-history-action">Assigned</div>
                  <div className="vt-history-who">{who}</div>
                  {when && <div className="vt-history-when">{when}</div>}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div className="vt-history-timeline">
        <div className="vt-history-entry">
          <div className="vt-history-dot" />
          <div className="vt-history-body">
            <div className="vt-history-action">Assigned</div>
            <div className="vt-history-who">N/A</div>
            <div className="vt-history-when">N/A</div>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="vt-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div onClick={onClose} className="vt-backdrop" />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="vt-modal"
          >
            {/* ── HEADER (72px height) ── */}
            <div className="vt-header">
              <div className="vt-header-left">
                <div className="vt-header-icon-wrap">
                  <ClipboardList size={20} strokeWidth={2} />
                </div>
                <h2 className="vt-header-title">View Task</h2>
              </div>
              <button onClick={onClose} type="button" className="vt-close-btn" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {/* ── BODY ── */}
            <div className="vt-body">
              {loading && <div className="vt-loading">Loading task details…</div>}
              {error && <div className="vt-error">{error}</div>}

              {!loading && data && (
                <>
                  {/* ── TASK SUMMARY (Compact Card with Task Name Header) ── */}
                  <div className="vt-summary-card">
                    <div className="vt-summary-header-row">
                      <div className="vt-card-header">
                        <div className="vt-card-icon vt-icon-purple">
                          <ClipboardList size={15} strokeWidth={2} />
                        </div>
                        <div className="vt-card-label">TASK NAME</div>
                      </div>
                      <span className="vt-summary-badge">General Task</span>
                    </div>
                    <h3 className="vt-summary-title">{getTaskName()}</h3>
                  </div>

                  {/* ── DETAIL CARDS (2-Column Grid) ── */}
                  <div className="vt-details-grid">
                    <div className="vt-details-col vt-details-col--left">
                      {/* Description Card */}
                      <div className="vt-detail-card vt-detail-card--desc">
                        <div className="vt-card-header">
                          <div className="vt-card-icon vt-icon-blue">
                            <FileText size={15} strokeWidth={2} />
                          </div>
                          <div className="vt-card-label">TASK DESCRIPTION</div>
                        </div>
                        <div className="vt-card-description">{renderDescription()}</div>
                      </div>

                      {/* Client Card */}
                      <div className="vt-detail-card vt-detail-card--client">
                        <div className="vt-card-header">
                          <div className="vt-card-icon vt-icon-indigo">
                            <UserRound size={15} strokeWidth={2} />
                          </div>
                          <div className="vt-card-label">CLIENT</div>
                        </div>
                        <div className="vt-card-value">{getClientName()}</div>
                      </div>
                    </div>

                    <div className="vt-details-col vt-details-col--right">
                      {/* Assignment History Card */}
                      <div className="vt-detail-card vt-detail-card--full">
                        <div className="vt-card-header">
                          <div className="vt-card-icon vt-icon-amber">
                            <History size={15} strokeWidth={2} />
                          </div>
                          <div className="vt-card-label">ASSIGNMENT HISTORY</div>
                        </div>
                        {getAssignmentHistory()}
                      </div>
                    </div>
                  </div>

                  {/* ── DATES ROW (One compact status row) ── */}
                  <div className="vt-dates-row">
                    {/* Expected Start */}
                    <div className="vt-date-card">
                      <div className="vt-date-header">
                        <div className="vt-date-icon vt-icon-purple">
                          <CalendarDays size={15} strokeWidth={2} />
                        </div>
                        <div className="vt-date-label">Expected Start</div>
                      </div>
                      <div className="vt-date-value">{getStartDate()}</div>
                    </div>

                    {/* Due Date */}
                    <div className="vt-date-card">
                      <div className="vt-date-header">
                        <div className="vt-date-icon vt-icon-pink">
                          <Calendar size={15} strokeWidth={2} />
                        </div>
                        <div className="vt-date-label">Due Date</div>
                      </div>
                      <div className="vt-date-value">{getDueDate()}</div>
                    </div>

                    {/* Completed */}
                    <div className="vt-date-card">
                      <div className="vt-date-header">
                        <div className="vt-date-icon vt-icon-green">
                          <CircleCheck size={15} strokeWidth={2} />
                        </div>
                        <div className="vt-date-label">Completed</div>
                      </div>
                      <div className="vt-date-value">{getCompletedDate()}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── FOOTER ── */}
            <div className="vt-footer">
              <button onClick={onClose} type="button" className="vt-btn-primary">
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};