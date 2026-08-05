import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Calendar, Clock, User, Phone, MapPin, Building2, Search, ChevronDown, ChevronUp, AlertCircle, FileText, ClipboardCheck, MessageSquare } from 'lucide-react';
import { getFollowupModalData, saveFollowupTask, getContactMethods, getWhereaboutsDispositions } from '../../services/dashboard.service';

interface FollowupCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedTaskId: number;
}

interface ComboboxOption {
  label: string;
  value: string | number;
  secondary?: string;
}

const SearchableCombobox: React.FC<{ options: ComboboxOption[], value: string | number, onChange: (val: string | number) => void, placeholder?: string, required?: boolean, icon?: React.ReactNode }> = ({ options, value, onChange, placeholder, required, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || (o.secondary && o.secondary.toLowerCase().includes(search.toLowerCase())));

  return (
    <div ref={wrapperRef} className="combobox-container">
      <div className={`combobox-input combobox-input-flex ${icon ? 'task-form-input-with-icon-left' : ''}`} onClick={() => { setIsOpen(!isOpen); if (isOpen) setSearch(''); }}>
        <span className={`combobox-value-span ${!selectedOption ? 'combobox-value-placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </div>
      {icon && <div className="task-input-icon-left task-input-icon-none">{icon}</div>}
      <div className="combobox-chevron">
        {isOpen ? <ChevronUp size={16} className="combobox-toggle-icon" onClick={(e) => { e.stopPropagation(); setIsOpen(false); setSearch(''); }} /> : <ChevronDown size={16} className="combobox-toggle-icon" onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} />}
      </div>
      {required && !value && <input type="text" className="combobox-hidden-input" required />}
      {isOpen && (
        <div className="combobox-panel">
          <div className="combobox-search-header">
            <div className="combobox-search-input-wrapper">
              <Search size={14} className="combobox-search-icon" />
              <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (filteredOptions.length > 0) { onChange(filteredOptions[0].value); setIsOpen(false); setSearch(''); } } else if (e.key === 'Escape') { e.preventDefault(); setIsOpen(false); } }} autoFocus className="combobox-search-input" />
            </div>
          </div>
          <div className="combobox-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div key={option.value} onClick={() => { onChange(option.value); setIsOpen(false); setSearch(''); }} className="combobox-option">
                  <div className="combobox-option-label">{option.label}</div>
                  {option.secondary && <div className="combobox-option-secondary">{option.secondary}</div>}
                </div>
              ))
            ) : <div className="combobox-empty">No matches found</div>}
          </div>
        </div>
      )}
    </div>
  );
};

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

const CustomTimePicker: React.FC<{ value: string, onChange: (val: string) => void, required?: boolean }> = ({ value, onChange, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputValue(formatTo12h(value)); }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBlur = () => {
    const parsed24h = formatTo24h(inputValue);
    if (parsed24h) { onChange(parsed24h); setInputValue(formatTo12h(parsed24h)); } 
    else { setInputValue(formatTo12h(value)); }
  };

  return (
    <div className="custom-time-picker" ref={containerRef}>
      <input type="text" className="task-form-input task-form-input-with-icon" value={inputValue} onChange={(e) => { setInputValue(e.target.value); const p = formatTo24h(e.target.value); if(p) onChange(p); }} onBlur={handleBlur} onFocus={() => setIsOpen(true)} onKeyDown={(e) => { if(e.key === 'Enter'){ e.preventDefault(); handleBlur(); setIsOpen(false); } if(e.key === 'Escape'){ setIsOpen(false); setInputValue(formatTo12h(value)); } }} placeholder="hh:mm AM/PM" required={required} />
      <Clock size={16} className="task-input-icon" />
      {isOpen && (
        <div className="time-picker-dropdown">
          <div className="time-picker-columns">
            <div className="time-picker-column">
              {['12','01','02','03','04','05','06','07','08','09','10','11'].map(h => (
                <div key={h} className={`time-picker-item ${formatTo12h(value).split(':')[0] === h ? 'selected' : ''}`} onMouseDown={(e) => { e.preventDefault(); const parts = formatTo12h(value).split(/[: ]/); const m = parts[1] || '00'; const a = parts[2] || 'PM'; onChange(formatTo24h(`${h}:${m} ${a}`)); setInputValue(`${h}:${m} ${a}`); }}>{h}</div>
              ))}
            </div>
            <div className="time-picker-column">
              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                <div key={m} className={`time-picker-item ${formatTo12h(value).split(/[: ]/)[1] === m ? 'selected' : ''}`} onMouseDown={(e) => { e.preventDefault(); const parts = formatTo12h(value).split(/[: ]/); const h = parts[0] || '12'; const a = parts[2] || 'PM'; onChange(formatTo24h(`${h}:${m} ${a}`)); setInputValue(`${h}:${m} ${a}`); }}>{m}</div>
              ))}
            </div>
            <div className="time-picker-column">
              {['AM', 'PM'].map(a => (
                <div key={a} className={`time-picker-item ${formatTo12h(value).split(' ')[1] === a ? 'selected' : ''}`} onMouseDown={(e) => { e.preventDefault(); const parts = formatTo12h(value).split(/[: ]/); const h = parts[0] || '12'; const m = parts[1] || '00'; onChange(formatTo24h(`${h}:${m} ${a}`)); setInputValue(`${h}:${m} ${a}`); setIsOpen(false); }}>{a}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const FollowupCompleteModal: React.FC<FollowupCompleteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedTaskId
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<any>(null);
  
  // Dropdown options
  const [methods, setMethods] = useState<ComboboxOption[]>([]);
  const [dispositions, setDispositions] = useState<ComboboxOption[]>([]);
  
  // Form State
  const [methodId, setMethodId] = useState<number | string>('');
  const [dispositionId, setDispositionId] = useState<number | string>('');
  const [contactDate, setContactDate] = useState('');
  const [contactTime, setContactTime] = useState('');
  const [notes, setNotes] = useState('');
  
  // Followup specific state
  const [attendedTreatment, setAttendedTreatment] = useState<string>('');
  const [rescheduledDate, setRescheduledDate] = useState('');
  const [rescheduledTime, setRescheduledTime] = useState('');
  const [comments, setComments] = useState('');
  
  const [error, setError] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && selectedTaskId) {
      loadData();
    }
  }, [isOpen, selectedTaskId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [followupDetails, methodsList, dispositionsList] = await Promise.all([
        getFollowupModalData(selectedTaskId),
        getContactMethods(),
        getWhereaboutsDispositions()
      ]);
      
      setDetails(followupDetails);
      setMethods(methodsList.map(m => ({ label: m.label, value: m.value })));
      setDispositions(dispositionsList.map(m => ({ label: m.label, value: m.value })));
      
      // Default Date/Time
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const da = String(now.getDate()).padStart(2, '0');
      setContactDate(`${yr}-${mo}-${da}`);
      
      const hr = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      setContactTime(`${hr}:${mi}`);
      
      // Defaults
      const phoneMethod = methodsList.find(m => m.label.toLowerCase().includes('phone'));
      if (phoneMethod) setMethodId(phoneMethod.value);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load followup details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispositionId) {
      setError('Disposition is required.');
      if (contentRef.current) contentRef.current.scrollTop = 0;
      return;
    }
    
    // For Aftercare/7-day, if Disposition indicates successful contact (not no answer/left message), Attended Treatment is required
    const dispStr = String(dispositionId);
    const isNoAnswerOrLeftMessage = dispStr === '2' || dispStr === '4';
    
    if (details?.FollowupType !== 'Funding/Parole/Probation Follow up' && !isNoAnswerOrLeftMessage) {
      if (!attendedTreatment) {
        setError('Attended Treatment selection is required.');
        if (contentRef.current) contentRef.current.scrollTop = 0;
        return;
      }
      if (attendedTreatment === '4' && (!rescheduledDate || !rescheduledTime)) {
        setError('Rescheduled Date and Time are required.');
        if (contentRef.current) contentRef.current.scrollTop = 0;
        return;
      }
    }
    
    setSaving(true);
    setError('');
    
    try {
      const payload: any = {
        methodId,
        dispositionId,
        contactDate,
        contactTime,
        notes
      };
      
      const followupForm: any = {
        FollowupType: details?.FollowupType === '7-Day Followup' ? '7-Day' : (details?.FollowupType === 'Aftercare Followup' ? 'Aftercare' : ''),
        AttendedTreatment: attendedTreatment,
        TreatmentRescheduledDate: rescheduledDate,
        TreatmentRescheduledTime: rescheduledTime,
        Comments: comments
      };
      
      payload.FollowupForm = JSON.stringify(followupForm);
      
      const res = await saveFollowupTask(selectedTaskId, payload);
      if (res.isSuccess) {
        onSuccess();
        onClose();
      } else {
        throw new Error(res.errorMessage || 'Failed to save followup task.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
      if (contentRef.current) contentRef.current.scrollTop = 0;
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="task-modal-overlay">
        <motion.div 
          className="task-modal-container"
          style={{ maxWidth: '1000px', width: '90%' }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="task-modal-header">
            <h2 className="task-modal-title">
              <ClipboardCheck size={20} className="task-modal-title-icon" />
              Followup Completion
            </h2>
            <button className="task-modal-close" onClick={onClose} disabled={saving}>
              <X size={20} />
            </button>
          </div>
          
          <div className="task-modal-content" ref={contentRef}>
            {loading ? (
              <div className="task-loading-state">
                <div className="task-loading-spinner" />
                <p>Loading followup details...</p>
              </div>
            ) : (
              <form id="followupForm" onSubmit={handleSubmit} className="task-form-layout">
                {error && (
                  <div className="task-alert task-alert-error" style={{ gridColumn: '1 / -1' }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="task-form-section" style={{ gridColumn: '1 / -1' }}>
                  <h3 className="task-form-section-title">
                    <User size={16} className="task-form-section-icon" />
                    Contact Information
                  </h3>
                  <div className="task-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {details?.ContactInfo && details.ContactInfo.map((contact: any, i: number) => (
                      <div key={i} className="followup-contact-card" style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', gridColumn: details.ContactInfo.length === 1 ? '1 / -1' : undefined }}>
                        <div style={{ marginBottom: '12px' }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a' }}>
                            {contact.FormattedName || `${contact.FirstName} ${contact.LastName}`}
                          </h4>
                          {contact.PhoneNumbers ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '14px' }}>
                              <Phone size={14} />
                              <span dangerouslySetInnerHTML={{ __html: contact.PhoneNumbers.replace(/,/g, '<br />') }} />
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '14px', fontWeight: 500 }}>
                              <AlertCircle size={14} />
                              This contact does not have a phone number.
                            </div>
                          )}
                        </div>
                        
                        {contact.OrganizationName && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Building2 size={14} /> Aftercare Facility
                            </h4>
                            <div style={{ color: '#0f172a', fontSize: '14px' }}>
                              <strong>{contact.OrganizationName}</strong><br />
                              {contact.StreetAddress1}<br />
                              {contact.StreetAddress2 && <>{contact.StreetAddress2}<br /></>}
                              {contact.CityStateZip}
                            </div>
                          </div>
                        )}
                        
                        {contact.AftercareAppointmentDate && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} /> Appointment Details
                            </h4>
                            <div style={{ color: '#0f172a', fontSize: '14px' }}>
                              {new Date(contact.AftercareAppointmentDate).toLocaleDateString()} @ {new Date(`2000-01-01T${contact.AftercareAppointmentTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="task-form-section" style={{ gridColumn: '1 / -1' }}>
                  <h3 className="task-form-section-title">
                    <Phone size={16} className="task-form-section-icon" />
                    Contact Log
                  </h3>
                  <div className="task-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className="task-form-group">
                      <label className="task-form-label">Contact Method</label>
                      <SearchableCombobox options={methods} value={methodId} onChange={(val) => setMethodId(val)} placeholder="Select Method..." icon={<Phone size={16} />} />
                    </div>
                    <div className="task-form-group">
                      <label className="task-form-label">Call Disposition <span className="task-required">*</span></label>
                      <SearchableCombobox options={dispositions} value={dispositionId} onChange={(val) => setDispositionId(val)} placeholder="Select Disposition..." required />
                    </div>
                    <div className="task-form-group">
                      <label className="task-form-label">Contact Date</label>
                      <div className="task-input-icon-wrapper">
                        <input type="date" className="task-form-input task-form-input-with-icon" value={contactDate} onChange={(e) => setContactDate(e.target.value)} required />
                        <Calendar size={16} className="task-input-icon" />
                      </div>
                    </div>
                    <div className="task-form-group">
                      <label className="task-form-label">Contact Time</label>
                      <CustomTimePicker value={contactTime} onChange={(val) => setContactTime(val)} required />
                    </div>
                    <div className="task-form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="task-form-label">Contact Notes</label>
                      <textarea className="task-form-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes regarding this attempt..." />
                    </div>
                  </div>
                </div>
                
                {String(dispositionId) !== '2' && String(dispositionId) !== '4' && details?.FollowupType !== 'Funding/Parole/Probation Follow up' && (
                  <div className="task-form-section" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <h3 className="task-form-section-title" style={{ marginTop: 0 }}>
                      <FileText size={16} className="task-form-section-icon" />
                      Followup Survey: {details?.FollowupType}
                    </h3>
                    
                    <div className="task-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="task-form-group">
                        <label className="task-form-label">Did the client attend treatment? <span className="task-required">*</span></label>
                        <select className="task-form-input" value={attendedTreatment} onChange={(e) => setAttendedTreatment(e.target.value)} required>
                          <option value="">-- Select Option --</option>
                          <option value="1">Yes</option>
                          <option value="2">No</option>
                          <option value="4">Rescheduled</option>
                        </select>
                      </div>
                      
                      {attendedTreatment === '4' && (
                        <div className="task-form-group">
                          <label className="task-form-label">Rescheduled Date and Time <span className="task-required">*</span></label>
                          <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="task-input-icon-wrapper" style={{ flex: 1 }}>
                              <input type="date" className="task-form-input task-form-input-with-icon" value={rescheduledDate} onChange={(e) => setRescheduledDate(e.target.value)} required />
                              <Calendar size={16} className="task-input-icon" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <CustomTimePicker value={rescheduledTime} onChange={(val) => setRescheduledTime(val)} required />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="task-form-group">
                        <label className="task-form-label">Comments</label>
                        <textarea className="task-form-textarea" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Additional followup comments..." />
                      </div>
                    </div>
                  </div>
                )}
                
                {details?.FollowupType === 'Funding/Parole/Probation Follow up' && (
                  <div className="task-form-section" style={{ gridColumn: '1 / -1' }}>
                    <h3 className="task-form-section-title">
                      <MessageSquare size={16} className="task-form-section-icon" />
                      Followup Comments
                    </h3>
                    <div className="task-form-group">
                      <textarea className="task-form-textarea" rows={4} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Notes for Funding/Parole/Probation Follow up..." required />
                    </div>
                  </div>
                )}

                {details?.AttemptHistory && details.AttemptHistory.length > 0 && (
                  <div className="task-form-section" style={{ gridColumn: '1 / -1' }}>
                    <h3 className="task-form-section-title">
                      <Clock size={16} className="task-form-section-icon" />
                      Attempt History ({details.AttemptHistory.length})
                    </h3>
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Date/Time</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Staff</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Phone</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Disposition</th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.AttemptHistory.map((attempt: any, i: number) => (
                            <tr key={i} style={{ borderBottom: i < details.AttemptHistory.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                              <td style={{ padding: '12px 16px', color: '#0f172a' }}>{attempt.CreateDate}</td>
                              <td style={{ padding: '12px 16px', color: '#0f172a' }}>{attempt.CreatedByName}</td>
                              <td style={{ padding: '12px 16px', color: '#0f172a' }}>{attempt.PhoneNumber || 'N/A'}</td>
                              <td style={{ padding: '12px 16px', color: '#0f172a' }}>{attempt.Disposition}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
              </form>
            )}
          </div>
          
          <div className="task-modal-footer">
            <button className="task-btn task-btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="task-btn task-btn-primary" type="submit" form="followupForm" disabled={saving || loading}>
              {saving ? (
                <>Saving... <div className="task-btn-spinner" /></>
              ) : (
                <><Save size={16} /> Save Followup</>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
