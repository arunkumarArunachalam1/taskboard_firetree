import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ClipboardCheck, Save, Calendar, Clock, User, Phone, Paperclip, MessageSquare, Upload, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { completeWhereaboutsTasks, getWhereaboutsContactMethods, getWhereaboutsTaskDetails, getWhereaboutsReasons, getWhereaboutsDispositions } from '../../services/dashboard.service';

interface WhereaboutsCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedTaskIds: number[];
  selectedClientId: number;
}

interface ComboboxOption {
  label: string;
  value: string | number;
  secondary?: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

const SearchableCombobox: React.FC<SearchableComboboxProps> = ({ options, value, onChange, placeholder, required, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.secondary && o.secondary.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={wrapperRef} className="combobox-container">
      <div
        className={`combobox-input combobox-input-flex ${icon ? 'task-form-input-with-icon-left' : ''}`}
        onClick={() => {
          if (isOpen) {
             setIsOpen(false);
             setSearch('');
          } else {
             setIsOpen(true);
          }
        }}
      >
        <span className={`combobox-value-span ${!selectedOption ? 'combobox-value-placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </div>
      {icon && (
        <div className="task-input-icon-left task-input-icon-none">
          {icon}
        </div>
      )}
      <div className="combobox-chevron">
        {isOpen ? (
          <ChevronUp 
            size={16} 
            className="combobox-toggle-icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setSearch('');
            }} 
          />
        ) : (
          <ChevronDown 
            size={16} 
            className="combobox-toggle-icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }} 
          />
        )}
      </div>
      {required && !value && <input type="text" className="combobox-hidden-input" required />}

      {isOpen && (
        <div className="combobox-panel">
          <div className="combobox-search-header">
            <div className="combobox-search-input-wrapper">
              <Search size={14} className="combobox-search-icon" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredOptions.length > 0) {
                      onChange(filteredOptions[0].value);
                      setIsOpen(false);
                      setSearch('');
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsOpen(false);
                  }
                }}
                autoFocus
                className="combobox-search-input"
              />
            </div>
          </div>
          <div className="combobox-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  onClick={() => { onChange(option.value); setIsOpen(false); setSearch(''); }}
                  className="combobox-option"
                >
                  <div className="combobox-option-label">{option.label}</div>
                  {option.secondary && <div className="combobox-option-secondary">{option.secondary}</div>}
                </div>
              ))
            ) : (
              <div className="combobox-empty">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  selectedTaskIds
}) => {
  const [saving, setSaving] = useState<boolean>(false);
  const [clientName, setClientName] = useState<string>('Quintez Hall');
  const [contactDisplay, setContactDisplay] = useState<string>('Quintez Hall @ (223) 384-0113');
  const [contactDate, setContactDate] = useState<string>('');
  const [contactTime, setContactTime] = useState<string>('09:25 AM');
  const [reason, setReason] = useState<string>('');
  const [reasons, setReasons] = useState<{value: string, label: string}[]>([]);
  const [methodId, setMethodId] = useState<string>('1');
  const [methods, setMethods] = useState<{value: string, label: string}[]>([]);
  const [dispositions, setDispositions] = useState<{ value: string; label: string }[]>([]);
  const [disposition, setDisposition] = useState<string>('');
  const [consent, setConsent] = useState<'yes' | 'no'>('no');
  const [consentExpiration, setConsentExpiration] = useState<string>('');
  const [documentationFile, setDocumentationFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setContactDate(today);
      
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      setContactTime(timeString);
      
      setReason('10');
      setMethodId('1');
      setDisposition('');
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
              
              if (res.isConsentReadOnly) {
                setConsent(res.isConsent || 'no');
                setConsentExpiration(res.consentExpiration || '');
              }
            }
          })
          .catch(() => {});
      }

      getWhereaboutsContactMethods()
        .then((methodList) => {
          if (methodList && Array.isArray(methodList)) {
            const allMethods = methodList.map((m: any) => ({
              value: String(m.value ?? m.VALUE ?? m.Value ?? ''),
              label: String(m.label ?? m.LABEL ?? m.Label ?? '')
            }));
            
            // Legacy behavior: only allow Phone method for Whereabouts Complete
            const phoneMethods = allMethods.filter(m => m.value === '1' || m.label.toLowerCase().includes('phone'));
            
            if (phoneMethods.length > 0) {
              setMethods(phoneMethods);
              setMethodId(phoneMethods[0].value);
            } else {
              setMethods(allMethods);
            }
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
            const verified = list.find((d: any) => {
              const lbl = String(d.label ?? d.LABEL ?? d.Label ?? '').toLowerCase();
              return lbl === 'whereabouts verified' || lbl === 'verified' || lbl.includes('verified');
            });
            if (verified) {
              setDisposition(String(verified.value ?? verified.VALUE ?? verified.Value ?? ''));
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, selectedTaskIds]);

  useEffect(() => {
    if (error) {
      const modalBody = document.querySelector('.task-modal-body');
      if (modalBody) {
        modalBody.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskIds.length === 0) return;

    if (!contactDate || !contactTime || !reason || !methodId || !disposition) {
      setError('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await completeWhereaboutsTasks({
        listids: selectedTaskIds.join(','),
        methodId: methodId,
        contactDate: contactDate,
        contactTime: contactTime,
        reasonId: reason,
        dispositionId: disposition,
        isConsent: consent === 'yes' ? 1 : 0,
        consentExpiration: consent === 'yes' ? consentExpiration : '',
        notes: notes,
        documentationFile: documentationFile
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
          className="task-modal-wrapper wc-modal-overlay"
        >
          <div onClick={onClose} className="task-modal-backdrop wc-modal-backdrop" />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="task-modal-content wc-modal-content"
          >
            {/* Header */}
            <div className="wc-header">
              <div className="wc-header-left">
                <div className="wc-header-icon-wrap">
                  <ClipboardCheck size={22} />
                </div>
                <h2 className="wc-header-title">Mark Whereabouts Complete</h2>
              </div>
              <button 
                onClick={onClose} 
                type="button"
                className="wc-close-btn"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="wc-form">
              <div className="task-modal-body wc-body">
                {error && (
                  <div className="task-alert-error wc-error">
                    {error}
                  </div>
                )}

                {/* Client and Contact Read-only display */}
                <div className="wc-client-card">
                  <div className="wc-client-col-left">
                    <div className="wc-icon-wrap">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="wc-label">Client</div>
                      <div className="wc-value">{clientName}</div>
                    </div>
                  </div>
                  <div className="wc-client-col-right">
                    <div className="wc-icon-wrap">
                      <Phone size={20} />
                    </div>
                    <div>
                      <div className="wc-label">Contact</div>
                      <div className="wc-value">{contactDisplay}</div>
                    </div>
                  </div>
                </div>

                {/* Whereabouts Details */}
                <div className="wc-section-container">
                  <div className="wc-section-header">
                    <Calendar size={18} color="#6d28d9" />
                    <h3 className="wc-section-title">Whereabouts Details</h3>
                  </div>
                  
                  <div className="wc-grid-row">
                    <div className="wc-grid-col">
                      <label className="wc-input-label">Date <span style={{color: '#ef4444'}}>*</span></label>
                      <div className="wc-input-wrapper">
                        <input
                          type="date"
                          value={contactDate}
                          onChange={(e) => setContactDate(e.target.value)}
                          className="wc-input-date"
                        />
                        <Calendar size={14} color="#6b7280" className="wc-input-icon" />
                      </div>
                    </div>

                    <div className="wc-grid-col">
                      <label className="wc-input-label">Time <span style={{color: '#ef4444'}}>*</span></label>
                      <CustomTimePicker
                        value={contactTime}
                        onChange={setContactTime}
                      />
                    </div>

                    <div className="wc-grid-col">
                      <label className="wc-input-label">Reason <span style={{color: '#ef4444'}}>*</span></label>
                      <SearchableCombobox
                        options={reasons}
                        value={reason}
                        onChange={(val) => setReason(String(val))}
                        placeholder="Select Reason..."
                      />
                    </div>
                  </div>

                  <div className="wc-grid-row">
                    <div className="wc-grid-col">
                      <label className="wc-input-label">Method <span style={{color: '#ef4444'}}>*</span></label>
                      <SearchableCombobox
                        options={methods}
                        value={methodId}
                        onChange={(val) => setMethodId(String(val))}
                        placeholder="Select Method..."
                      />
                    </div>

                    <div className="wc-grid-col">
                      <label className="wc-input-label">Disposition <span style={{color: '#ef4444'}}>*</span></label>
                      <SearchableCombobox
                        options={dispositions}
                        value={disposition}
                        onChange={(val) => setDisposition(String(val))}
                        placeholder="Select Disposition..."
                      />
                    </div>
                  </div>

                  {String(reason) !== '10' && (
                    <div className="wc-consent-card">
                      <div className="wc-consent-row">
                        <div className="wc-consent-col">
                          <label className="wc-consent-title">Is Consent? <span style={{color: '#ef4444'}}>*</span></label>
                          <div className="wc-consent-radios">
                            <label className="wc-radio-label">
                              <input
                                type="radio"
                                name="consent"
                                value="yes"
                                checked={consent === 'yes'}
                                onChange={() => setConsent('yes')}
                                className="wc-radio-input"
                              />
                              Yes
                            </label>
                            <label className="wc-radio-label">
                              <input
                                type="radio"
                                name="consent"
                                value="no"
                                checked={consent === 'no'}
                                onChange={() => {
                                  setConsent('no');
                                  setConsentExpiration('');
                                }}
                                className="wc-radio-input"
                              />
                              No
                            </label>
                          </div>
                        </div>

                        <div className="wc-divider"></div>

                        <div className="wc-consent-exp-col">
                          <label className="wc-consent-exp-label">Expiration Date</label>
                          <div className={`wc-consent-exp-value ${consent === 'yes' ? 'active' : 'inactive'}`}>
                            {consent === 'yes' && consentExpiration ? (
                              (() => {
                                const [yr, mo, da] = consentExpiration.split('-');
                                return `${mo}/${da}/${yr}`;
                              })()
                            ) : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Documentation Section */}
                <div className="wc-section-container">
                  <div className="wc-section-header">
                    <Paperclip size={18} color="#6d28d9" />
                    <h3 className="wc-section-title">Documentation</h3>
                  </div>
                  
                  <div className="wc-upload-card">
                    <label className="wc-upload-btn">
                      <Upload size={16} color="#6d28d9" />
                      Choose File
                      <input
                        type="file"
                        onChange={(e) => setDocumentationFile(e.target.files ? e.target.files[0] : null)}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <div className="wc-upload-info">
                      <span className="wc-upload-filename">
                        {documentationFile ? documentationFile.name : 'Upload supporting documents, images or files (optional)'}
                      </span>
                      {!documentationFile && (
                        <span className="wc-upload-hint">PDF, PNG, JPG up to 10MB</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div>
                  <div className="wc-section-header">
                    <MessageSquare size={18} color="#6d28d9" />
                    <h3 className="wc-section-title">Notes</h3>
                  </div>
                  
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this whereabouts completion..."
                    className="wc-textarea"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="wc-footer">
                <button 
                  onClick={onClose} 
                  type="button" 
                  disabled={saving}
                  className="wc-btn-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="wc-btn-save"
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
