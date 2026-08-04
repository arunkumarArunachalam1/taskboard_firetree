import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PhoneCall, Save, History, Building2 } from 'lucide-react';
import { getFollowupModalData, saveFollowupTask } from '../../services/dashboard.service';

interface FollowupTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  taskId: number | null;
}

export const FollowupTaskModal: React.FC<FollowupTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  taskId
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [disposition, setDisposition] = useState<string>('Completed');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && taskId) {
      setLoading(true);
      setError(null);
      getFollowupModalData(taskId)
        .then((res) => {
          if (res && res.isSuccess) {
            setData(res);
          } else {
            setError(res?.errorMessage || 'Failed to load Followup task data.');
          }
        })
        .catch((err) => {
          setError(err.message || 'Error loading Followup data.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setData(null);
      setDisposition('Completed');
      setNotes('');
      setError(null);
    }
  }, [isOpen, taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId) return;

    setSaving(true);
    setError(null);
    try {
      const res = await saveFollowupTask(taskId, {
        disposition,
        notes
      });
      if (res && res.isSuccess) {
        onSuccess();
        onClose();
      } else {
        setError(res?.errorMessage || 'Failed to save Followup task.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving Followup task.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="task-modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ zIndex: 10005 }}
        >
          <div onClick={onClose} className="task-modal-backdrop" />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="task-modal-content"
            style={{ maxWidth: '700px', width: '95%' }}
          >
            <div className="task-modal-header">
              <div className="task-modal-header-content">
                <div className="task-modal-header-icon">
                  <PhoneCall size={24} />
                </div>
                <div>
                  <h2 className="task-modal-title">Followup Task Modal</h2>
                  <p className="task-modal-subtitle">
                    {data ? data.TaskName : 'Aftercare Followup'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="task-modal-close-btn" type="button">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="task-modal-body" style={{ padding: '24px', overflowY: 'auto', maxHeight: '70vh' }}>
                {loading && (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Loading Followup task details...
                  </div>
                )}

                {error && (
                  <div className="task-alert-error" style={{ marginBottom: '16px' }}>
                    {error}
                  </div>
                )}

                {!loading && data && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Facility Info Card */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Building2 size={16} /> Discharge / Aftercare Information
                      </h4>
                      <div style={{ fontSize: '13px', color: '#475569' }}>
                        <div><strong>Client ID:</strong> {data.ClientID}</div>
                      </div>
                    </div>

                    {/* Attempt History Table */}
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <History size={16} /> Contact Attempt History
                      </h4>
                      {data.attemptHistory && data.attemptHistory.length > 0 ? (
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px', color: '#475569' }}>Attempt Date</th>
                                <th style={{ padding: '8px 10px', color: '#475569' }}>Staff</th>
                                <th style={{ padding: '8px 10px', color: '#475569' }}>Phone</th>
                                <th style={{ padding: '8px 10px', color: '#475569' }}>Disposition</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.attemptHistory.map((item: any, idx: number) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px 10px' }}>{item.AttemptDate}</td>
                                  <td style={{ padding: '8px 10px' }}>{item.CreatedByName}</td>
                                  <td style={{ padding: '8px 10px' }}>{item.PhoneNumber || '--'}</td>
                                  <td style={{ padding: '8px 10px' }}>{item.Disposition}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                          No previous attempt records found.
                        </div>
                      )}
                    </div>

                    {/* New Attempt / Contact Log Form */}
                    <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>
                        Record Contact / Complete Followup
                      </h4>
                      <div className="task-form-group">
                        <label className="task-form-label">Disposition</label>
                        <select
                          value={disposition}
                          onChange={(e) => setDisposition(e.target.value)}
                          className="task-form-input"
                        >
                          <option value="Completed">Completed</option>
                          <option value="No Answer">No Answer / Left Message</option>
                          <option value="Rescheduled">Rescheduled</option>
                        </select>
                      </div>

                      <div className="task-form-group" style={{ marginTop: '12px' }}>
                        <label className="task-form-label">Notes</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="task-form-textarea"
                          rows={3}
                          placeholder="Enter contact notes..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="task-modal-footer">
                <button onClick={onClose} className="task-btn-secondary" type="button" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="task-btn-primary" disabled={loading || saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Followup'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
