import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, MapPin, Calendar, Info, Settings, User, Phone, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFacilityStaff, getClientList, getClientEventDestinations, getClientContacts, getContactMethods, saveWhereaboutsTask, getContactPhoneNumbers } from '../../services/dashboard.service';
import { useAppContext } from '../../context/AppContext';

interface NewWhereaboutsTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

// Reusable Combobox component
interface ComboboxOption {
  label: string;
  value: string | number; // ClientCaseFileID
  clientId?: string | number; // Actual ClientID
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

interface StaffResponse {
  Value?: number;
  VALUE?: number;
  value?: number;
  Display?: string;
  DISPLAY?: string;
  display?: string;
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
  const displayValue = isOpen ? search : (selectedOption ? selectedOption.label : '');

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
        {value ? (
          <X 
            size={16} 
            className="combobox-clear-icon"
            onClick={(e) => { 
              e.stopPropagation(); 
              onChange(''); 
              setSearch(''); 
              setIsOpen(false); 
            }} 
          />
        ) : null}
        <ChevronDown 
          size={16} 
          className={`combobox-toggle-icon ${isOpen ? 'combobox-toggle-icon-open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) {
               setIsOpen(false);
               setSearch('');
            } else {
               setIsOpen(true);
            }
          }} 
        />
      </div>
      {required && !value && <input type="text" className="combobox-hidden-input" required />}

      {isOpen && (
        <div className="combobox-panel">
          <div className="combobox-search-header">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="combobox-search-input"
            />
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

const formatTo12h = (time24: string): string => {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return time24;
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
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
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

export const NewWhereaboutsTaskModal: React.FC<NewWhereaboutsTaskModalProps> = ({ isOpen, onClose, onTaskCreated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [clientId, setClientId] = useState<string | number>('');
  const [methodId, setMethodId] = useState<string | number>('');
  const [expectedStartDate, setExpectedStartDate] = useState('');
  const [expectedStartTime, setExpectedStartTime] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [expectedEndTime, setExpectedEndTime] = useState('');
  const [destinationId, setDestinationId] = useState<string | number>('');
  const [contactId, setContactId] = useState<string | number>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | number>('');

  // Dropdown Options
  const [clients, setClients] = useState<ComboboxOption[]>([]);
  const [methods, setMethods] = useState<ComboboxOption[]>([]);
  const [destinations, setDestinations] = useState<ComboboxOption[]>([]);
  const [contacts, setContacts] = useState<{ value: string; label: string; phone: string }[]>([]);
  const [contactPhoneNumbers, setContactPhoneNumbers] = useState<ComboboxOption[]>([]);
  const [staff, setStaff] = useState<ComboboxOption[]>([]);

  const { currentFacilityID } = useAppContext();

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      console.log("[NewWhereaboutsTaskModal] Fetching initial data...");
      
      // Reset form fields
      setClientId('');
      setMethodId('');
      setExpectedStartTime('');
      setExpectedEndTime('');
      setDestinationId('');
      setContactId('');
      setPhoneNumber('');
      setAssignedTo('');
      setError(null);

      const loadData = async () => {
        try {
          const clientList = await getClientList(currentFacilityID).catch(e => { console.error("getClientList failed:", e); return []; });
          setClients((clientList || []).map((c: any) => ({
            value: c.value ?? c.VALUE ?? 0,
            label: c.display ?? c.DISPLAY ?? 'Unknown Client',
            clientId: c.clientId ?? c.CLIENTID ?? 0
          })));

          const methodList = await getContactMethods().catch(e => { console.error("getContactMethods failed:", e); return []; });
          setMethods((methodList || []).map((m: any) => ({
            value: m.value ?? m.VALUE ?? m.Value ?? 0,
            label: String(m.label ?? m.LABEL ?? m.Label ?? 'Unknown Method')
          })));

          const staffList = await getFacilityStaff(currentFacilityID).catch(e => { console.error("getFacilityStaff failed:", e); return []; });
          setStaff((staffList || []).map((s: StaffResponse) => ({ value: s.Value ?? s.VALUE ?? s.value ?? 0, label: s.Display ?? s.DISPLAY ?? s.display ?? '' })));

        } catch (mappingError) {
          console.error("Error mapping dropdown options:", mappingError);
        }
      };
      
      loadData().then(() => {

        // Defaults
        const today = new Date().toISOString().split('T')[0];
        setExpectedStartDate(today);
        setExpectedEndDate(today);
      }).catch(err => {
        console.error("[NewWhereaboutsTaskModal] Promise.all completely failed:", err);
      });
    }
  }, [isOpen]);

  // Load destinations and contacts when client changes
  useEffect(() => {
    if (clientId) {
      const selectedClient = clients.find(c => String(c.value) === String(clientId));
      const actualClientId = selectedClient?.clientId || clientId;

      Promise.all([
        getClientEventDestinations(actualClientId),
        getClientContacts(actualClientId)
      ]).then(([dests, contactList]) => {
        setDestinations(dests.map((d: any) => ({
          value: d.value ?? d.VALUE ?? d.Value ?? 0,
          label: d.label ?? d.LABEL ?? d.Label ?? 'Unknown Destination'
        })));
        setContacts(contactList.map((c: any) => ({
          value: String(c.value ?? c.VALUE ?? c.Value ?? ''),
          label: String(c.label ?? c.LABEL ?? c.Label ?? 'Unknown Contact'),
          phone: String(c.phone ?? c.PHONE ?? c.Phone ?? '')
        })));
        setDestinationId('');
        setContactId('');
        setPhoneNumber('');
      });
    } else {
      setDestinations([]);
      setContacts([]);
      setDestinationId('');
      setContactId('');
      setPhoneNumber('');
    }
  }, [clientId]);

  // Load phone numbers when destination changes
  useEffect(() => {
    if (destinationId) {
      getContactPhoneNumbers(destinationId).then(phones => {
        setContactPhoneNumbers(phones.map((p: any) => ({
          value: p.value ?? p.VALUE ?? p.Value ?? '',
          label: p.label ?? p.LABEL ?? p.Label ?? 'Unknown Phone'
        })));
        setPhoneNumber(''); // clear selected phone
      }).catch(err => {
        console.error("Failed to fetch contact phone numbers:", err);
        setContactPhoneNumbers([]);
      });
    } else {
      setContactPhoneNumbers([]);
      setPhoneNumber('');
    }
  }, [destinationId]);

  // Auto-fill phone number when contact changes
  useEffect(() => {
    if (contactId) {
      const selected = contacts.find(c => String(c.value) === String(contactId));
      // Only auto-fill if it's a plain phone string, otherwise we use the dropdown ID
      if (selected && selected.phone && !selected.phone.includes('_')) {
        // Find if this phone matches any in the dropdown
        const matchingPhone = contactPhoneNumbers.find(p => p.label.includes(selected.phone));
        if (matchingPhone) {
          setPhoneNumber(String(matchingPhone.value));
        } else {
          setPhoneNumber(selected.phone);
        }
      }
    }
  }, [contactId, contacts, contactPhoneNumbers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const selectedClient = clients.find(c => String(c.value) === String(clientId));
      const actualClientId = selectedClient?.clientId || clientId;

      const payload = {
        clientId: actualClientId, methodId, expectedStartDate, expectedStartTime,
        expectedEndDate, expectedEndTime, destinationId, contactId,
        contactPhoneNumberId: phoneNumber, assignedTo
      };

      const result = await saveWhereaboutsTask(payload);
      if (result.isSuccess === 1) {
        onTaskCreated();
        onClose();
      } else {
        setError(result.errorMessage || 'Failed to save task.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        >
          {/* Backdrop */}
          <div onClick={onClose} className="task-modal-backdrop" />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="task-modal-content"
          >
            {/* Header (Fixed) */}
            <div className="task-modal-header">
              <div className="task-modal-header-content">
                <div className="task-modal-header-icon">
                  <MapPin size={24} />
                </div>
                <div>
                  <h2 className="task-modal-title">Create Whereabouts Task</h2>
                  <p className="task-modal-subtitle">Add a new whereabouts task to track client movements.</p>
                </div>
              </div>
              <button onClick={onClose} type="button" className="task-modal-close">
                <X size={20} />
              </button>
            </div>

            {/* Form Wrapper */}
            <form onSubmit={handleSubmit} className="task-modal-form">

              {/* Scrollable Form Body */}
              <div className="task-modal-body">
                {error && (
                  <div className="task-modal-error">
                    {error}
                  </div>
                )}

                <div className="task-form-group">
                  <label className="task-form-label">Client <span className="task-required-asterisk">*</span></label>
                  <SearchableCombobox options={clients} value={clientId} onChange={setClientId} placeholder="Search for a client..." required icon={<User size={16} />} />
                </div>

                <div className="task-form-group">
                  <label className="task-form-label">Method <span className="task-required-asterisk">*</span></label>
                  <SearchableCombobox options={methods} value={methodId} onChange={setMethodId} placeholder="Select a method..." required icon={<Settings size={16} />} />
                </div>

                <div className="task-form-row">
                  <div className="task-form-col">
                    <label className="task-form-label">Expected Start Date <span className="task-required-asterisk">*</span></label>
                    <div className="task-input-wrapper">
                      <div className="task-input-icon-left">
                        <Calendar size={16} />
                      </div>
                      <input
                        type="date"
                        value={expectedStartDate}
                        onChange={e => setExpectedStartDate(e.target.value)}
                        onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                        required
                        className="task-form-input task-form-input-with-icon-left task-form-input-h38"
                      />
                    </div>
                  </div>
                  <div className="task-form-col">
                    <label className="task-form-label">Time <span className="task-required-asterisk">*</span></label>
                    <CustomTimePicker
                      value={expectedStartTime}
                      onChange={setExpectedStartTime}
                      required
                    />
                  </div>
                </div>

                <div className="task-form-row">
                  <div className="task-form-col">
                    <label className="task-form-label">Expected End Date <span className="task-required-asterisk">*</span></label>
                    <div className="task-input-wrapper">
                      <div className="task-input-icon-left">
                        <Calendar size={16} />
                      </div>
                      <input
                        type="date"
                        value={expectedEndDate}
                        onChange={e => setExpectedEndDate(e.target.value)}
                        onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                        required
                        className="task-form-input task-form-input-with-icon-left task-form-input-h38"
                      />
                    </div>
                  </div>
                  <div className="task-form-col">
                    <label className="task-form-label">Time <span className="task-required-asterisk">*</span></label>
                    <CustomTimePicker
                      value={expectedEndTime}
                      onChange={setExpectedEndTime}
                      required
                    />
                  </div>
                </div>

                <div className="task-form-group">
                  <label className="task-form-label">Today's Destinations <span className="task-required-asterisk">*</span></label>
                  <SearchableCombobox options={destinations} value={destinationId} onChange={setDestinationId} placeholder="Select an event destination..." required icon={<MapPin size={16} />} />
                  {!clientId && <div className="task-field-error">Select a client first to see destinations.</div>}
                </div>

                <div className="task-form-row">
                  <div className="task-form-col">
                    <label className="task-form-label">Contact Name <span className="task-required-asterisk">*</span></label>
                    <SearchableCombobox options={contacts.map(c => ({ value: c.value, label: c.label }))} value={contactId} onChange={setContactId} placeholder="Select a contact..." required icon={<User size={16} />} />
                  </div>
                  <div className="task-form-col">
                    <label className="task-form-label">Phone Number</label>
                    <SearchableCombobox options={contactPhoneNumbers} value={phoneNumber} onChange={(val) => setPhoneNumber(String(val))} placeholder="Select a phone number..." icon={<Phone size={16} />} />
                  </div>
                </div>

                <div className="task-form-group-sm">
                  <label className="task-form-label">Assign To</label>
                  <SearchableCombobox options={staff} value={assignedTo} onChange={setAssignedTo} placeholder="Search staff members..." icon={<User size={16} />} />
                </div>

                <div className="task-modal-info-banner">
                  <Info size={16} className="task-modal-info-icon" />
                  <p className="task-modal-info-text">All fields marked with <span className="task-required-asterisk">*</span> are required.</p>
                </div>
              </div>

              {/* Footer (Fixed) */}
              <div className="task-modal-footer">
                <button
                  type="button"
                  onClick={onClose}
                  className="task-btn-cancel"
                >
                  <X size={16} /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="task-btn-submit"
                >
                  <Save size={16} /> {isSubmitting ? 'Saving...' : 'Save Task'}
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
