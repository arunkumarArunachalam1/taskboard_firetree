import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Calendar, Clock, User, Search, ChevronDown, ChevronUp, AlertCircle, MessageSquare, Minus, ArrowUpDown, Paperclip, Upload } from 'lucide-react';
import { getFollowupModalData, saveFollowupTask, getFollowupContactPhoneNumbers, getFollowupDispositions } from '../../services/dashboard.service';

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
  const filteredOptions = options.filter(o =>
    (o.label || '').toString().toLowerCase().includes((search || '').toLowerCase()) ||
    (o.secondary && (o.secondary || '').toString().toLowerCase().includes((search || '').toLowerCase()))
  );

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

interface CustomTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}

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
                  onClick={(e) => { e.preventDefault(); handleSelectTime(h, currentMinute, currentAmpm); }}
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
                  onClick={(e) => { e.preventDefault(); handleSelectTime(currentHour, m, currentAmpm); }}
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
                  onClick={(e) => { e.preventDefault(); handleSelectTime(currentHour, currentMinute, a); }}
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
  const [notes] = useState('');

  // Followup specific state
  const [attendedTreatment, setAttendedTreatment] = useState<string>('');
  const [interestedInReturning, setInterestedInReturning] = useState<string>('');
  const [isSober, setIsSober] = useState<string>('');
  const [attendingSupportMeetings, setAttendingSupportMeetings] = useState<string>('');
  const [rescheduledDate, setRescheduledDate] = useState('');
  const [rescheduledTime, setRescheduledTime] = useState('');
  const [comments, setComments] = useState('');
  const [documentationFile, setDocumentationFile] = useState<File | null>(null);

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
        getFollowupContactPhoneNumbers(selectedTaskId),
        getFollowupDispositions()
      ]);

      setDetails(followupDetails);
      setMethods(methodsList.map((m: any) => ({ label: m.label, value: m.value })));
      setDispositions(dispositionsList.map((m: any) => ({ label: m.label, value: m.value })));

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
      if (methodsList && methodsList.length > 0) {
        setMethodId(methodsList[0].value);
      }

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

    const dispStr = String(dispositionId);
    const hideSurvey = ['2', '4', '12'].includes(dispStr);

    const followupType = details?.FollowupType || details?.FOLLOWUPTYPE;
    if (followupType !== 'Funding/Parole/Probation Follow up' && !hideSurvey) {
      if (!attendedTreatment) {
        setError('Question 1 (Attended Treatment) is required.');
        if (contentRef.current) contentRef.current.scrollTop = 0;
        return;
      }
      if (attendedTreatment === '4' && (!rescheduledDate || !rescheduledTime)) {
        setError('Rescheduled Date and Time are required.');
        if (contentRef.current) contentRef.current.scrollTop = 0;
        return;
      }
      if (followupType === '7-Day Followup') {
        if (!interestedInReturning) {
          setError('Question 2 (Interested in returning) is required.');
          if (contentRef.current) contentRef.current.scrollTop = 0;
          return;
        }
        if (!isSober) {
          setError('Question 3 (Are you sober?) is required.');
          if (contentRef.current) contentRef.current.scrollTop = 0;
          return;
        }
        if (!attendingSupportMeetings) {
          setError('Question 4 (Attending support meetings?) is required.');
          if (contentRef.current) contentRef.current.scrollTop = 0;
          return;
        }
      }
    }

    setSaving(true);
    setError('');

    try {
      const payload: any = {
        methodId: 1, // Phone by default
        dispositionId,
        contactDate,
        contactTime,
        notes
      };

      if (documentationFile) {
        payload.documentationFile = documentationFile;
      }

      if (typeof methodId === 'string' && methodId.includes('_')) {
        const parts = methodId.split('_');
        const prefix = parts[0];
        const id = parts[1];
        if (prefix === 'CC') {
           payload.ClientContactPhoneNumberID = id;
        } else if (prefix === 'C') {
           payload.ContactPhoneNumberID = id;
        }
      }

      const followupForm: any = {
        FollowupType: followupType === '7-Day Followup' ? '7-Day' : (followupType === 'Aftercare Followup' ? 'Aftercare' : ''),
        AttendedTreatment: attendedTreatment,
        InterestedInReturningToTreatment: interestedInReturning,
        IsSober: isSober,
        IsAttendingMeetings: attendingSupportMeetings,
        TreatmentRescheduledDate: rescheduledDate,
        TreatmentRescheduledTime: rescheduledTime,
        Comments: comments
      };

      payload.FollowupForm = JSON.stringify(followupForm);

      const res = await saveFollowupTask(selectedTaskId, payload);
      if (res.isSuccess || res.ISSUCCESS) {
        onSuccess();
        onClose();
      } else {
        throw new Error(res.errorMessage || res.ERRORMESSAGE || 'Failed to save followup task.');
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
            style={{ maxWidth: '1100px', width: '95%' }}
          >
            {/* ── HEADER ── */}
            <div className="vt-header">
              <div className="vt-header-left">
                <div className="vt-header-icon-wrap">
                  <Calendar size={20} strokeWidth={2} />
                </div>
                <h2 className="vt-header-title">
                  {(details?.FollowupType || details?.FOLLOWUPTYPE) || 'Followup'} for {
                    (() => {
                      const ch = details?.ClientHeader || details?.CLIENTHEADER;
                      const dataArr = ch?.DATA || ch?.data;
                      if (!dataArr || !dataArr[0]) return '';
                      const row = dataArr[0];
                      let fname = '', lname = '';
                      if (Array.isArray(row) && ch.COLUMNS) {
                        const idxF = ch.COLUMNS.findIndex((c: string) => c.toUpperCase() === 'FIRSTNAME');
                        const idxL = ch.COLUMNS.findIndex((c: string) => c.toUpperCase() === 'LASTNAME');
                        if (idxF >= 0) fname = row[idxF];
                        if (idxL >= 0) lname = row[idxL];
                      } else {
                        fname = row.FIRSTNAME || row.FirstName || '';
                        lname = row.LASTNAME || row.LastName || '';
                      }
                      return (fname ? fname.charAt(0) + '. ' : '') + lname;
                    })()
                  }
                </h2>
              </div>
              <button onClick={onClose} type="button" className="vt-close-btn" disabled={saving}>
                <X size={20} />
              </button>
            </div>

            {/* ── BODY ── */}
            <div className="vt-body" ref={contentRef}>
              {loading ? (
                <div className="vt-loading">Loading followup details...</div>
              ) : (
                <div>
                  {(details?.ClientHeader || details?.CLIENTHEADER) && (() => {
                    const headerData = details?.ClientHeader || details?.CLIENTHEADER;
                    let data: any = {};
                    if (headerData && headerData.COLUMNS && headerData.DATA && headerData.DATA.length > 0) {
                      const row = headerData.DATA[0];
                      if (Array.isArray(row)) {
                        headerData.COLUMNS.forEach((col: string, idx: number) => { data[col.toLowerCase()] = row[idx]; });
                      } else if (typeof row === 'object') {
                        Object.keys(row).forEach(k => { data[k.toLowerCase()] = row[k]; });
                      }
                    } else if (Array.isArray(headerData)) {
                      const rawData = headerData[0];
                      if (rawData && typeof rawData === 'object') {
                        Object.keys(rawData).forEach(k => { data[k.toLowerCase()] = rawData[k]; });
                      }
                    }

                    const getPronouns = (d: any) => {
                      if (d.pronounfield === 'Other') return d.pronounfieldother || 'Other';
                      if (d.pronounfield) return d.pronounfield;
                      if (d.sex === 'Male') return 'He/Him';
                      if (d.sex === 'Female') return 'She/Her';
                      return '';
                    };

                    const pronouns = getPronouns(data);
                    const formattedName = `${data.lastname || ''}, ${data.firstname || ''} ${pronouns ? `(${pronouns})` : ''}`.trim();

                    const formatDate = (dateStr: string) => {
                      if (!dateStr) return '';
                      return new Date(dateStr).toLocaleDateString('en-US', { timeZone: 'UTC' });
                    };

                    const formatDateTime = (dateStr: string) => {
                      if (!dateStr) return '';
                      const d = new Date(dateStr);
                      return `${d.toLocaleDateString('en-US', { timeZone: 'UTC' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })}`;
                    };

                    return (
                      <div className="followup-client-header" style={{ borderLeftColor: data.dischargedate ? '#881337' : '#5b21b6' }}>
                        <div className="followup-client-left">
                          <div className="followup-client-icon-wrap" style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <User size={40} color="#94a3b8" />
                            {data.dischargedate && (
                              <div style={{ position: 'absolute', bottom: '0', right: '0', width: '20px', height: '20px', backgroundColor: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                                <Minus size={12} color="white" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <div>
                            <h2 className="followup-client-name" style={{ color: '#5b21b6' }}>{formattedName}</h2>

                            <div className="followup-client-info-row">
                              <span className="followup-client-info-item"><span className="followup-client-info-label">Client ID:</span> <span className="followup-client-info-value">{data.clientid}</span></span>
                              <span className="followup-client-info-item"><span className="followup-client-info-label">DOB:</span> <span className="followup-client-info-value">{formatDate(data.birthdate)}</span></span>
                              <span className="followup-client-info-item"><span className="followup-client-info-label">SSN:</span> <span className="followup-client-info-value">{data.ssn || ''}</span></span>
                            </div>

                            <div className="followup-client-info-row">
                              <span className="followup-client-info-item"><span className="followup-client-info-label">Parole #:</span> <span className="followup-client-info-value">{data.parolenumber || 'N/A'}</span></span>
                              <span className="followup-client-info-item"><span className="followup-client-info-label">MA #:</span> <span className="followup-client-info-value">{data.manumber || ''}</span></span>
                            </div>

                            <div className="followup-client-info-row" style={{ marginBottom: 0 }}>
                              <span className="followup-client-info-item"><span className="followup-client-info-label">Admitted to Stay:</span> <span className="followup-client-info-value">{formatDateTime(data.admitdate)}</span></span>
                              <span className="followup-client-info-item"><span className="followup-client-info-label">PDD:</span> <span className="followup-client-info-value">{formatDate(data.expecteddischargedate)}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="followup-client-right">
                          <div className="followup-client-status">
                            <div className="followup-client-status-dot" style={{ backgroundColor: data.dischargedate ? '#dc2626' : (!data.admitdate ? '#f59e0b' : '#16a34a') }}></div>
                            <span className="followup-client-status-text" style={{ color: '#1e293b', fontWeight: 'bold' }}>
                              {data.dischargedate ? 'Inactive Case' : (!data.admitdate ? 'Pre-Admit' : 'Active Case')}
                            </span>
                          </div>

                          <div className="followup-client-details">
                            <div className="followup-client-details-row">
                              <div className="followup-client-details-item">
                                <span className="followup-client-details-label">Program:</span>
                                <span className="followup-client-info-value">{data.programname || ''}</span>
                              </div>
                            </div>
                            <div className="followup-client-details-row">
                              <div className="followup-client-details-item">
                                <span className="followup-client-details-label">Funding Source:</span>
                                <span className="followup-client-info-value">{data.fundingsourcename || ''}</span>
                              </div>
                            </div>
                            <div className="followup-client-details-row">
                              <div className="followup-client-details-item">
                                <span className="followup-client-details-label">Case Manager:</span>
                                <span className="followup-client-info-value">{data.cmfirst ? `${data.cmfirst} ${data.cmlast}` : ''}</span>
                              </div>
                            </div>
                            <div className="followup-client-details-row">
                              <div className="followup-client-details-item">
                                <span className="followup-client-details-label">Room:</span>
                                <span className="followup-client-info-value">{data.roomname || 'N/A'}</span>
                              </div>
                              <div className="followup-client-details-item">
                                <span className="followup-client-details-label">Bed:</span>
                                <span className="followup-client-info-value">{data.bedname || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <form id="followupForm" onSubmit={handleSubmit} className="task-form-layout" style={{ marginTop: '24px' }}>
                    {error && (
                      <div className="task-alert task-alert-error" style={{ gridColumn: '1 / -1' }}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}



                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>



                      {/* Attempt Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '4px', height: '18px', background: '#5b21b6', borderRadius: '2px' }}></div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                          Attempt #{(details?.AttemptHistory || details?.ATTEMPTHISTORY || []).length + 1}
                        </h3>
                      </div>

                      {/* 4-column Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        <div className="task-form-group">
                          <label className="task-form-label">Call Date <span style={{ color: '#ef4444' }}>*</span></label>
                          <input type="date" className="task-form-input" value={contactDate} onChange={(e) => setContactDate(e.target.value)} required />
                        </div>
                        <div className="task-form-group">
                          <label className="task-form-label">Call Time <span style={{ color: '#ef4444' }}>*</span></label>
                          <CustomTimePicker value={contactTime} onChange={(val) => setContactTime(val)} required />
                        </div>
                        <div className="task-form-group">
                          <label className="task-form-label">Contact Phone/Email</label>
                          <SearchableCombobox options={methods} value={methodId} onChange={(val) => setMethodId(val)} placeholder="" />
                        </div>
                        <div className="task-form-group">
                          <label className="task-form-label">Call Disposition</label>
                          <SearchableCombobox options={dispositions} value={dispositionId} onChange={(val) => setDispositionId(val)} placeholder="" required />
                        </div>
                      </div>

                      {/* Survey Box */}
                      {(details?.FollowupType || details?.FOLLOWUPTYPE) !== 'Funding/Parole/Probation Follow up' && !['2', '4', '12'].includes(String(dispositionId)) && (
                        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>

                            {/* Q1 */}
                            <div className="task-form-group" style={{ gridColumn: (details?.FollowupType || details?.FOLLOWUPTYPE) === '7-Day Followup' ? 'span 1' : '1 / -1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: '#7c3aed', color: '#fff', fontSize: '12px', fontWeight: '600', borderRadius: '4px' }}>1</span>
                                  <label style={{ margin: 0, fontWeight: '600', color: '#1e293b', fontSize: '14px', lineHeight: '22px' }}>Did you attend your aftercare appointment? <span style={{ color: '#ef4444' }}>*</span></label>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '20px', marginLeft: '34px' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                    <input type="radio" name="q1" value="1" checked={attendedTreatment === '1'} onChange={(e) => setAttendedTreatment(e.target.value)} style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                                    Yes
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                    <input type="radio" name="q1" value="2" checked={attendedTreatment === '2'} onChange={(e) => setAttendedTreatment(e.target.value)} style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                                    No
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                    <input type="radio" name="q1" value="4" checked={attendedTreatment === '4'} onChange={(e) => setAttendedTreatment(e.target.value)} style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                                    No, but rescheduled it for
                                  </label>
                                </div>
                                {attendedTreatment === '4' && (
                                  <div style={{ display: 'flex', gap: '16px', marginLeft: '34px' }}>
                                    <div className="task-input-icon-wrapper" style={{ flex: 1 }}>
                                      <input type="date" className="task-form-input task-form-input-with-icon-right" style={{ paddingRight: '36px', background: '#fff' }} value={rescheduledDate} onChange={(e) => setRescheduledDate(e.target.value)} required />
                                      <Calendar size={16} className="task-input-icon-right" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <CustomTimePicker value={rescheduledTime} onChange={(val) => setRescheduledTime(val)} required />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {(details?.FollowupType || details?.FOLLOWUPTYPE) === '7-Day Followup' && (
                              <>
                                {/* Q2 */}
                                <div className="task-form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: '#7c3aed', color: '#fff', fontSize: '12px', fontWeight: '600', borderRadius: '4px' }}>2</span>
                                      <label style={{ margin: 0, fontWeight: '600', color: '#1e293b', fontSize: '14px', lineHeight: '22px' }}>Are you interested in returning to treatment at this time? <span style={{ color: '#ef4444' }}>*</span></label>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '20px', marginLeft: '34px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                      <input type="radio" name="q2" value="Yes" checked={interestedInReturning === 'Yes'} onChange={(e) => setInterestedInReturning(e.target.value)} style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                                      Yes
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                      <input type="radio" name="q2" value="No" checked={interestedInReturning === 'No'} onChange={(e) => setInterestedInReturning(e.target.value)} style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                                      No
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                      <input type="radio" name="q2" value="Undecided" checked={interestedInReturning === 'Undecided'} onChange={(e) => setInterestedInReturning(e.target.value)} style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                                      Undecided
                                    </label>
                                  </div>
                                </div>

                                {/* Q3 */}
                                <div className="task-form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: '#7c3aed', color: '#fff', fontSize: '12px', fontWeight: '600', borderRadius: '4px' }}>3</span>
                                      <label style={{ margin: 0, fontWeight: '600', color: '#1e293b', fontSize: '14px', lineHeight: '22px' }}>Are you sober? <span style={{ color: '#ef4444' }}>*</span></label>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '20px', marginLeft: '34px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                      <input type="radio" name="q3" value="Yes" checked={isSober === 'Yes'} onChange={(e) => setIsSober(e.target.value)} style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                                      Yes
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                      <input type="radio" name="q3" value="No" checked={isSober === 'No'} onChange={(e) => setIsSober(e.target.value)} style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                                      No
                                    </label>
                                  </div>
                                </div>

                                {/* Q4 */}
                                <div className="task-form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', background: '#7c3aed', color: '#fff', fontSize: '12px', fontWeight: '600', borderRadius: '4px' }}>4</span>
                                      <label style={{ margin: 0, fontWeight: '600', color: '#1e293b', fontSize: '14px', lineHeight: '22px' }}>Are you attending support/12 step meetings? <span style={{ color: '#ef4444' }}>*</span></label>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '20px', marginLeft: '34px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                      <input type="radio" name="q4" value="Yes" checked={attendingSupportMeetings === 'Yes'} onChange={(e) => setAttendingSupportMeetings(e.target.value)} style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                                      Yes
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                      <input type="radio" name="q4" value="No" checked={attendingSupportMeetings === 'No'} onChange={(e) => setAttendingSupportMeetings(e.target.value)} style={{ accentColor: '#7c3aed', width: '16px', height: '16px' }} />
                                      No
                                    </label>
                                  </div>
                                </div>
                              </>
                            )}

                          </div>
                        </div>
                      )}

                      {/* Comments & Documentation */}
                      <div style={{ display: 'grid', gridTemplateColumns: (details?.FollowupType || details?.FOLLOWUPTYPE) === 'Funding/Parole/Probation Follow up' ? '1fr 1fr' : '1fr', gap: '24px' }}>
                        
                        {/* Comments */}
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: '600', marginBottom: '12px' }}>
                            <MessageSquare size={16} color="#7c3aed" />
                            <span style={{ fontSize: '14px' }}>Comments</span>
                          </div>
                          <textarea
                            className="task-form-textarea"
                            rows={3}
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Add any additional notes..."
                            style={{ resize: 'none', border: '1px solid #e2e8f0', width: '100%', height: 'calc(100% - 34px)' }}
                          />
                        </div>

                        {/* Documentation (Only for Funding/Parole/Probation Follow up) */}
                        {(details?.FollowupType || details?.FOLLOWUPTYPE) === 'Funding/Parole/Probation Follow up' && (
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: '600', marginBottom: '12px' }}>
                              <Paperclip size={16} color="#7c3aed" />
                              <span style={{ fontSize: '14px' }}>Documentation <span style={{ color: '#64748b', fontWeight: '400' }}>(Optional)</span></span>
                            </div>
                            <div className="wc-upload-card" style={{ background: '#f8fafc', height: 'calc(100% - 34px)', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <label className="wc-upload-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#7c3aed', fontWeight: '600', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', margin: 0 }}>
                                <Upload size={16} color="#7c3aed" />
                                Choose File
                                <input
                                  type="file"
                                  onChange={(e) => setDocumentationFile(e.target.files ? e.target.files[0] : null)}
                                  style={{ display: 'none' }}
                                />
                              </label>
                              <div className="wc-upload-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className="wc-upload-filename" style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                                  {documentationFile ? documentationFile.name : 'Upload supporting documents, images or files (optional)'}
                                </span>
                                {!documentationFile && (
                                  <span className="wc-upload-hint" style={{ fontSize: '12px', color: '#64748b' }}>PDF, PNG, JPG up to 10MB</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                    </div>

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

                    {(details?.AttemptHistory || details?.ATTEMPTHISTORY) && (details?.AttemptHistory || details?.ATTEMPTHISTORY).length > 0 && (
                      <div className="task-form-section" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: '600', marginBottom: '16px' }}>
                          <Clock size={16} color="#7c3aed" />
                          <span>Attempt History</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Attempt Date <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px', opacity: 0.5 }} /></th>
                                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Attempted By <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px', opacity: 0.5 }} /></th>
                                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Contact <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px', opacity: 0.5 }} /></th>
                                <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Call Disposition <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px', opacity: 0.5 }} /></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(details?.AttemptHistory || details?.ATTEMPTHISTORY).map((attempt: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '12px 0', color: '#1e293b', fontWeight: '500' }}>{attempt.ContactDate} {attempt.ContactTime}</td>
                                  <td style={{ padding: '12px 0', color: '#1e293b', fontWeight: '500' }}>{attempt.CreatedByName}</td>
                                  <td style={{ padding: '12px 0', color: '#1e293b', fontWeight: '500' }}>{attempt.ContactMethod || ''}</td>
                                  <td style={{ padding: '12px 0', color: '#1e293b', fontWeight: '500' }}>{attempt.Disposition}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </form>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button type="button" onClick={onClose} disabled={saving} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b', fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" form="followupForm" disabled={saving || loading} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#7c3aed', color: '#ffffff', fontWeight: '500', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {saving ? (
                  <>Saving... <div className="task-btn-spinner" /></>
                ) : (
                  <><Save size={16} /> Save</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
