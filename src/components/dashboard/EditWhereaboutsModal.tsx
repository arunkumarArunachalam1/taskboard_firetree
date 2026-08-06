import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, PhoneCall, Save } from 'lucide-react';
import { getWhereaboutsTaskDetails, saveEditWhereaboutsTask } from '../../services/dashboard.service';

interface EditWhereaboutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  taskId: number | null;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

// ... keeping utility functions as they are
const formatToYYYYMMDD = (dateStr: string): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split(/[/-]/);
  if (parts.length === 3) {
    const [m, d, y] = parts;
    if (y.length === 4) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return dateStr;
};

interface CustomTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}

const formatTo12h = (timeStr: string): string => {
  if (!timeStr) return '';
  if (/AM|PM/i.test(timeStr)) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1].substring(0, 2);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
};

const formatTo24h = (timeStr: string): string => {
  if (!timeStr) return '';
  const match = timeStr.match(/^\s*(0?[1-9]|1[0-2])\s*:\s*([0-5][0-9])\s*(AM|PM)\s*$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const match24 = timeStr.match(/^\s*([0-1]?[0-9]|2[0-3])\s*:\s*([0-5][0-9])\s*$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = match24[2];
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  return '';
};

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({ value, onChange, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(formatTo12h(value));
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const parsed24h = formatTo24h(val);
    if (parsed24h) {
      onChange(parsed24h);
    }
  };

  const handleBlur = () => {
    const parsed24h = formatTo24h(inputValue);
    if (parsed24h) {
      onChange(parsed24h);
      setInputValue(formatTo12h(parsed24h));
    } else {
      setInputValue(formatTo12h(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
      setIsOpen(false);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue(formatTo12h(value));
    }
  };

  const handleSelectTime = (h: string, m: string, a: string) => {
    const time12 = `${h}:${m} ${a}`;
    const time24 = formatTo24h(time12);
    onChange(time24);
    setInputValue(time12);
  };

  const time12 = formatTo12h(value) || '12:00 PM';
  const parts = time12.split(':');
  const currentHour = parts[0];
  const subParts = parts[1].split(' ');
  const currentMinute = subParts[0];
  const currentAmpm = subParts[1] || 'PM';

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div ref={containerRef} className="timepicker-wrapper">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="--:--"
        required={required}
        className="task-form-input timepicker-input"
      />
      <div className="timepicker-icon-right">
        <Clock size={15} />
      </div>

      {isOpen && (
        <div className="combobox-panel timepicker-dropdown-panel">
          {/* Hour Column */}
          <div className="custom-time-col timepicker-column">
            <div className="timepicker-column-header">HH</div>
            {hours.map(h => {
              const isSelected = String(h) === String(parseInt(currentHour, 10));
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSelectTime(h, currentMinute, currentAmpm)}
                  className={`timepicker-item-btn ${isSelected ? 'active' : ''}`}
                >
                  {h}
                </button>
              );
            })}
          </div>

          {/* Minute Column */}
          <div className="custom-time-col timepicker-column timepicker-column-bordered">
            <div className="timepicker-column-header">MM</div>
            {minutes.map(m => {
              const isSelected = m === currentMinute;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectTime(currentHour, m, currentAmpm)}
                  className={`timepicker-item-btn ${isSelected ? 'active' : ''}`}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* AM/PM Column */}
          <div className="timepicker-ampm-col">
            {['AM', 'PM'].map(a => {
              const isSelected = a === currentAmpm;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => handleSelectTime(currentHour, currentMinute, a)}
                  className={`timepicker-ampm-btn ${isSelected ? 'active' : ''}`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const EditWhereaboutsModal: React.FC<EditWhereaboutsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  taskId,
  showToast
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('');
  const [contactDisplay, setContactDisplay] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && taskId) {
      setLoading(true);
      setError(null);
      
      getWhereaboutsTaskDetails(taskId)
        .then((taskRes) => {
          if (taskRes && (taskRes.isSuccess || taskRes.ISSUCCESS)) {
            const cName = taskRes.ClientName || '';
            setClientName(cName);
            setContactDisplay(taskRes.ContactDisplay || (cName && taskRes.ContactPhone ? `${cName} @ ${taskRes.ContactPhone}` : ''));

            if (taskRes.ExpectedStartDate) setStartDate(formatToYYYYMMDD(taskRes.ExpectedStartDate));
            if (taskRes.ExpectedStartTime) setStartTime(taskRes.ExpectedStartTime);
            if (taskRes.ExpectedDueDate) setDueDate(formatToYYYYMMDD(taskRes.ExpectedDueDate));
            if (taskRes.ExpectedDueTime) setDueTime(taskRes.ExpectedDueTime);
          } else {
            setError(taskRes?.errorMessage || taskRes?.ERRORMESSAGE || 'Failed to load Whereabouts task details.');
          }
        })
        .catch((err) => {
          setError(err.message || 'Error loading task details.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setClientName('');
      setContactDisplay('');
      setStartDate('');
      setStartTime('');
      setDueDate('');
      setDueTime('');
      setError(null);
    }
  }, [isOpen, taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId) return;

    setSaving(true);
    setError(null);
    try {
      const res = await saveEditWhereaboutsTask(taskId, {
        'Task.ExpectedStartDate': startDate,
        'Task.ExpectedStartTime': startTime,
        'Task.ExpectedDueDate': dueDate,
        'Task.ExpectedDueTime': dueTime
      });
      if (res && (res.isSuccess || res.ISSUCCESS)) {
        if (showToast) showToast('Whereabouts Task updated successfully.', 'success');
        onSuccess();
        onClose();
      } else {
        const errMsg = res?.errorMessage || res?.ERRORMESSAGE || 'Failed to update Whereabouts task.';
        setError(errMsg);
        if (showToast) showToast(errMsg, 'error');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Error updating task.';
      setError(errMsg);
      if (showToast) showToast(errMsg, 'error');
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
            className="task-modal-content ew-modal-content"
          >
            {/* Header */}
            <div className="ew-header">
              <div className="ew-header-left">
                <div className="ew-header-icon-wrap">
                  <Calendar size={22} color="#8B5CF6" />
                </div>
                <h2 className="ew-header-title">
                  Edit Whereabouts
                </h2>
              </div>
              <button
                onClick={onClose}
                type="button"
                className="ew-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit}>
              <div className="ew-body">
                {loading && (
                  <div className="ew-loading">
                    Loading task details...
                  </div>
                )}

                {error && (
                  <div className="task-alert-error ew-error">
                    {error}
                  </div>
                )}

                {!loading && (
                  <div>
                    {/* Client & Contact Card */}
                    <div className="ew-client-card">
                      <div className="ew-client-col-left">
                        <div className="ew-icon-wrap">
                          <User size={20} color="#8B5CF6" />
                        </div>
                        <div>
                          <div className="ew-label">Client</div>
                          <div className="ew-value">{clientName || 'Philip Riehl'}</div>
                        </div>
                      </div>

                      <div className="ew-client-col-right">
                        <div className="ew-icon-wrap">
                          <PhoneCall size={20} color="#8B5CF6" />
                        </div>
                        <div>
                          <div className="ew-label">Contact</div>
                          <div className="ew-value">{contactDisplay || 'Philip Riehl @ (717) 933-5729'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Schedule Information Header */}
                    <h3 className="ew-section-title">
                      Schedule Information
                    </h3>

                    {/* Schedule Information 2x2 Grid */}
                    <div className="ew-schedule-grid">
                      {/* Expected Start Date */}
                      <div className="ew-schedule-card">
                        <div className="ew-schedule-title">
                          <Calendar size={15} color="#8B5CF6" />
                          Expected Start Date <span style={{ color: '#DC2626' }}>*</span>
                        </div>
                        <div className="task-input-wrapper">
                          <div className="task-input-icon-left">
                            <Calendar size={16} />
                          </div>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                            required
                            className="task-form-input task-form-input-with-icon-left task-form-input-h38"
                          />
                        </div>
                      </div>

                      {/* Expected Start Time */}
                      <div className="ew-schedule-card">
                        <div className="ew-schedule-title">
                          <Clock size={15} color="#8B5CF6" />
                          Expected Start Time <span style={{ color: '#DC2626' }}>*</span>
                        </div>
                        <CustomTimePicker
                          value={startTime}
                          onChange={setStartTime}
                          required
                        />
                      </div>

                      {/* Expected Due Date */}
                      <div className="ew-schedule-card">
                        <div className="ew-schedule-title">
                          <Calendar size={15} color="#8B5CF6" />
                          Expected Due Date <span style={{ color: '#DC2626' }}>*</span>
                        </div>
                        <div className="task-input-wrapper">
                          <div className="task-input-icon-left">
                            <Calendar size={16} />
                          </div>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                            required
                            className="task-form-input task-form-input-with-icon-left task-form-input-h38"
                          />
                        </div>
                      </div>

                      {/* Expected Due Time */}
                      <div className="ew-schedule-card">
                        <div className="ew-schedule-title">
                          <Clock size={15} color="#8B5CF6" />
                          Expected Due Time <span style={{ color: '#DC2626' }}>*</span>
                        </div>
                        <CustomTimePicker
                          value={dueTime}
                          onChange={setDueTime}
                          required
                        />
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="ew-footer">
                <button
                  onClick={onClose}
                  type="button"
                  disabled={saving}
                  className="ew-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || saving}
                  className="ew-btn-save"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save'}
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

