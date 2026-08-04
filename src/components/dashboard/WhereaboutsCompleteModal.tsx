import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Save, Calendar, Clock } from 'lucide-react';
import { saveWhereaboutsTask, getContactMethods, getWhereaboutsTaskDetails, getWhereaboutsReasons, getWhereaboutsDispositions } from '../../services/dashboard.service';

interface WhereaboutsCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedTaskIds: number[];
  selectedClientId: number;
}


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

export const WhereaboutsCompleteModal: React.FC<WhereaboutsCompleteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedTaskIds,
  selectedClientId
}) => {
  const [saving, setSaving] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('Quintez Hall');
  const [contactDisplay, setContactDisplay] = useState<string>('Quintez Hall @ (223) 384-0113');
  const [contactDate, setContactDate] = useState<string>('');
  const [contactTime, setContactTime] = useState<string>('09:25 AM');
  const [reason, setReason] = useState<string>('7-day Followup');
  const [methodId, setMethodId] = useState<string>('Phone');
  const [methods, setMethods] = useState<{ value: string; label: string }[]>([]);
  const [reasons, setReasons] = useState<{ value: string; label: string }[]>([]);
  const [dispositions, setDispositions] = useState<{ value: string; label: string }[]>([]);
  const [disposition, setDisposition] = useState<string>('Whereabouts Verified');
  const [consent, setConsent] = useState<'yes' | 'no'>('no');
  const [consentExpiration, setConsentExpiration] = useState<string>('');
  const [documentationFile, setDocumentationFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setContactDate(today);
      setContactTime('09:25 AM');
      setReason('7-day Followup');
      setMethodId('Phone');
      setDisposition('Whereabouts Verified');
      setConsent('no');
      setConsentExpiration('');
      setDocumentationFile(null);
      setNotes('');
      setError(null);

      if (selectedTaskIds.length > 0) {
        getWhereaboutsTaskDetails(selectedTaskIds[0])
          .then((res) => {
            if (res && res.isSuccess) {
              const cName = res.ClientName || 'Quintez Hall';
              setClientName(cName);
              setContactDisplay(res.ContactDisplay || `${cName} @ ${res.ContactPhone || '(223) 384-0113'}`);
            }
          })
          .catch(() => {});
      }

      getContactMethods()
        .then((methodList) => {
          if (methodList && Array.isArray(methodList)) {
            setMethods(methodList.map((m: any) => ({
              value: String(m.value ?? m.VALUE ?? m.Value ?? ''),
              label: String(m.label ?? m.LABEL ?? m.Label ?? '')
            })));
          }
        })
        .catch(() => {});

      getWhereaboutsReasons()
        .then((list) => {
          if (list && Array.isArray(list)) {
            setReasons(list.map((item: any) => ({
              value: String(item.value ?? item.VALUE ?? item.Value ?? ''),
              label: String(item.label ?? item.LABEL ?? item.Label ?? '')
            })));
          }
        })
        .catch(() => {});

      getWhereaboutsDispositions()
        .then((list) => {
          if (list && Array.isArray(list)) {
            setDispositions(list.map((item: any) => ({
              value: String(item.value ?? item.VALUE ?? item.Value ?? ''),
              label: String(item.label ?? item.LABEL ?? item.Label ?? '')
            })));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, selectedTaskIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskIds.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await saveWhereaboutsTask({
        clientId: selectedClientId,
        methodId: methodId || '1',
        expectedStartDate: contactDate,
        expectedStartTime: contactTime,
        expectedEndDate: contactDate,
        expectedEndTime: contactTime,
        destinationId: 0,
        contactId: 0,
        reason: reason,
        disposition: disposition,
        consent: consent,
        consentExpiration: consent === 'yes' ? consentExpiration : '',
        documentationFile: documentationFile,
        notes: notes
      });

      if (res && res.isSuccess) {
        onSuccess();
        onClose();
      } else {
        setError(res?.errorMessage || 'Failed to complete Whereabouts task.');
      }
    } catch (err: any) {
      setError(err.message || 'Error marking Whereabouts task complete.');
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
            style={{ maxWidth: '820px', width: '95%' }}
          >
            <div className="task-modal-header">
              <div className="task-modal-header-content">
                <div className="task-modal-header-icon">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h2 className="task-modal-title">Mark Whereabouts Complete</h2>
                  <p className="task-modal-subtitle">
                    Record accountability contact for {selectedTaskIds.length} task(s)
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="task-modal-close-btn" type="button">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="task-modal-body" style={{ padding: '24px', overflowY: 'auto', maxHeight: '75vh' }}>
                {error && (
                  <div className="task-alert-error" style={{ marginBottom: '16px' }}>
                    {error}
                  </div>
                )}

                {/* Client and Contact Read-only display */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      Clients
                    </div>
                    <div style={{ fontSize: '14px', color: '#4B5563' }}>
                      {clientName}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      Contact
                    </div>
                    <div style={{ fontSize: '14px', color: '#4B5563' }}>
                      {contactDisplay}
                    </div>
                  </div>
                </div>

                {/* 5-Column Grid: Date, Time, Reason, Method, Disposition */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                    gap: '14px',
                    marginBottom: '20px'
                  }}
                >
                  <div className="task-form-group">
                    <label className="task-form-label">Date</label>
                    <div className="task-input-wrapper">
                      <div className="task-input-icon-left">
                        <Calendar size={16} />
                      </div>
                      <input
                        type="date"
                        value={contactDate}
                        onChange={(e) => setContactDate(e.target.value)}
                        onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                        className="task-form-input task-form-input-with-icon-left"
                        style={{ height: '38px', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div className="task-form-group">
                    <label className="task-form-label">Time</label>
                    <CustomTimePicker
                      value={contactTime}
                      onChange={setContactTime}
                    />
                  </div>

                  <div className="task-form-group">
                    <label className="task-form-label">Reason</label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="task-form-input"
                      style={{ height: '38px', fontSize: '13px' }}
                    >
                      {reasons.length > 0 ? (
                        reasons.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="7-day Followup">7-day Followup</option>
                          <option value="14-day Followup">14-day Followup</option>
                          <option value="30-day Followup">30-day Followup</option>
                          <option value="60-day Followup">60-day Followup</option>
                          <option value="Other">Other</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="task-form-group">
                    <label className="task-form-label">Method</label>
                    <select
                      value={methodId}
                      onChange={(e) => setMethodId(e.target.value)}
                      className="task-form-input"
                      style={{ height: '38px', fontSize: '13px' }}
                    >
                      {methods.length > 0 ? (
                        methods.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Phone">Phone</option>
                          <option value="Email">Email</option>
                          <option value="In-Person">In-Person</option>
                          <option value="Video Call">Video Call</option>
                          <option value="Text Message">Text Message</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="task-form-group">
                    <label className="task-form-label">Disposition</label>
                    <select
                      value={disposition}
                      onChange={(e) => setDisposition(e.target.value)}
                      className="task-form-input"
                      style={{ height: '38px', fontSize: '13px' }}
                    >
                      {dispositions.length > 0 ? (
                        dispositions.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Whereabouts Verified">Whereabouts Verified</option>
                          <option value="Whereabouts Unverified">Whereabouts Unverified</option>
                          <option value="Left Message">Left Message / No Answer</option>
                          <option value="Rescheduled">Rescheduled</option>
                          <option value="Completed">Completed</option>
                          <option value="Other">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Consent & Consent Expiration */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                    gap: '14px',
                    marginBottom: '20px'
                  }}
                >
                  <div className="task-form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="task-form-label">Consent</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                        <input
                          type="radio"
                          name="consent"
                          checked={consent === 'yes'}
                          onChange={() => setConsent('yes')}
                          style={{ cursor: 'pointer' }}
                        />
                        Yes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                        <input
                          type="radio"
                          name="consent"
                          checked={consent === 'no'}
                          onChange={() => {
                            setConsent('no');
                            setConsentExpiration('');
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        No
                      </label>
                    </div>
                  </div>

                  <div className="task-form-group" style={{ gridColumn: 'span 3' }}>
                    <label className="task-form-label">Consent Expiration</label>
                    <div className="task-input-wrapper">
                      <div className="task-input-icon-left" style={{ opacity: consent === 'no' ? 0.4 : 1 }}>
                        <Calendar size={16} />
                      </div>
                      <input
                        type="date"
                        value={consentExpiration}
                        onChange={(e) => setConsentExpiration(e.target.value)}
                        disabled={consent === 'no'}
                        onClick={(e) => { if (consent === 'yes') { try { (e.target as any).showPicker?.(); } catch(err) {} } }}
                        className="task-form-input task-form-input-with-icon-left"
                        style={{
                          height: '38px',
                          fontSize: '13px',
                          opacity: consent === 'no' ? 0.5 : 1,
                          cursor: consent === 'no' ? 'not-allowed' : 'pointer',
                          background: consent === 'no' ? '#F3F4F6' : '#FFFFFF'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Documentation */}
                <div className="task-form-group" style={{ marginBottom: '20px' }}>
                  <label className="task-form-label">Documentation</label>
                  <div style={{ marginTop: '6px' }}>
                    <input
                      type="file"
                      onChange={(e) => setDocumentationFile(e.target.files?.[0] || null)}
                      style={{
                        fontSize: '13px',
                        color: '#4B5563',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        background: '#F9FAFB',
                        cursor: 'pointer',
                        width: 'auto'
                      }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="task-form-group">
                  <label className="task-form-label">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="task-form-textarea"
                    rows={4}
                    placeholder="Enter contact notes..."
                    style={{ width: '100%', minHeight: '100px', fontSize: '14px', padding: '10px 12px' }}
                  />
                </div>
              </div>

              <div className="task-modal-footer">
                <button onClick={onClose} className="task-btn-secondary" type="button" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="task-btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Submitting...' : 'Complete Task(s)'}
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
