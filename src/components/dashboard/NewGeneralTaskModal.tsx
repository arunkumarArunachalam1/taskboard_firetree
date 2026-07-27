import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ClipboardCheck, Calendar, Info, Bot, User, FileText, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFacilityStaff, getClientList, saveGeneralTask } from '../../services/dashboard.service';
import type { FacilityStaff } from '../../types/dashboard.types';
import type { ClientOption } from '../../services/dashboard.service';
import { useAppContext } from '../../context/AppContext';

interface NewGeneralTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

// Reusable Combobox/Autocomplete component for Client and Staff selection
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

  // Display search text when actively typing, otherwise show selected label
  const displayValue = isOpen ? search : (selectedOption ? selectedOption.label : '');

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.secondary && o.secondary.toLowerCase().includes(search.toLowerCase()))
  );

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase()
            ? <strong key={i} className="combobox-highlight">{part}</strong>
            : part
        )}
      </>
    );
  };

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
      {/* Hidden input to ensure required validation fires natively if empty */}
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
            {filteredOptions.length > 0 ? filteredOptions.map(option => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="combobox-option"
              >
                <div className="combobox-option-label">{highlightMatch(option.label, search)}</div>
                {option.secondary && <div className="combobox-option-secondary">Case File ID: {highlightMatch(option.secondary, search)}</div>}
              </div>
            )) : (
              <div className="combobox-empty">
                No results found for "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export const NewGeneralTaskModal: React.FC<NewGeneralTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated
}) => {
  const [formData, setFormData] = useState({
    ClientCaseFileID: '',
    TaskName: '',
    TaskDescription: '',
    ExpectedStartDate: new Date().toISOString().split('T')[0],
    ExpectedDueDate: new Date().toISOString().split('T')[0],
    AssignTo: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, { MESSAGE: string }>>({});

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [staff, setStaff] = useState<FacilityStaff[]>([]);
  
  const { currentFacilityID } = useAppContext();

  // Prevent background scroll when modal is open and load dropdown data
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Reset form data when opening
      setFormData({
        ClientCaseFileID: '',
        TaskName: '',
        TaskDescription: '',
        ExpectedStartDate: new Date().toISOString().split('T')[0],
        ExpectedDueDate: new Date().toISOString().split('T')[0],
        AssignTo: ''
      });
      setError(null);
      setFieldErrors({});

      // Load data sequentially to prevent backend session race conditions
      const loadData = async () => {
        try {
          const clientsData = await getClientList(currentFacilityID);
          setClients(clientsData);
        } catch (err) {
          console.error('Failed to load clients:', err);
        }

        try {
          const staffData = await getFacilityStaff(currentFacilityID);
          setStaff(staffData);
        } catch (err) {
          console.error('Failed to load staff:', err);
        }
      };
      
      loadData();

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleComboboxChange = (name: string, value: string | number) => {
    setFormData({
      ...formData,
      [name]: String(value)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      if (!formData.TaskDescription || formData.TaskDescription.trim() === '') {
        setError('Please provide a task description.');
        setLoading(false);
        return;
      }

      const payload = new FormData();
      payload.append('Task.ClientCaseFileID', formData.ClientCaseFileID);
      payload.append('Task.TaskName', formData.TaskName);
      payload.append('Task.TaskDescription', formData.TaskDescription);
      payload.append('Task.ExpectedStartDate', formData.ExpectedStartDate);
      payload.append('Task.ExpectedDueDate', formData.ExpectedDueDate);
      payload.append('Task.AssignedTo', formData.AssignTo || '');

      const result = await saveGeneralTask(payload);

      if (result.ISSUCCESS || result.isSuccess) {
        onTaskCreated();
        onClose();
      } else {
        setError(result.ERRORMESSAGE || result.errorMessage || 'Failed to save task.');
        if (result.ERRORS || result.errors) {
          setFieldErrors(result.ERRORS || result.errors);
        }
      }
    } catch (err: any) {
      setError(err.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  // Prepare combobox options
  const clientOptions = clients.map((c: any) => {
    const display = c.DISPLAY || c.Display || c.display || 'Unknown Client';
    const val = c.VALUE || c.Value || c.value || 0;
    return {
      label: display,
      value: val
    };
  });

  const staffOptions = [
    { label: 'Unassigned', value: '' },
    ...staff
      .filter((s: any) => s.ISINACTIVE !== 1 && s.IsInactive !== 1 && s.isinactive !== 1)
      .map((s: any) => {
        const display = s.DISPLAY || s.Display || s.display || 'Unknown Staff';
        // Coerce value to string to ensure React key uniqueness and combobox matching
        const val = s.VALUE !== undefined ? String(s.VALUE) : (s.Value !== undefined ? String(s.Value) : (s.value !== undefined ? String(s.value) : ''));
        return {
          label: display,
          value: val
        };
      })
  ];

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
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h2 className="task-modal-title">Create General Task</h2>
                  <p className="task-modal-subtitle">Add a new general task to assign and track progress.</p>
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
                  <label className="task-form-label">Task Name <span className="task-required-asterisk">*</span></label>
                  <div className="task-input-wrapper">
                    <input
                      type="text"
                      name="TaskName"
                      value={formData.TaskName}
                      onChange={handleChange}
                      required
                      placeholder="Enter task name"
                      className="task-form-input task-form-input-with-icon-right"
                    />
                    <div className="task-input-icon-right">
                      <FileText size={16} />
                    </div>
                  </div>
                </div>

                <div className="task-form-group">
                  <label className="task-form-label">Description <span className="task-required-asterisk">*</span></label>
                  <div className="textarea-wrapper">
                    <textarea
                      name="TaskDescription"
                      value={formData.TaskDescription}
                      onChange={handleChange}
                      required
                      placeholder="Enter task description..."
                      className="task-form-textarea task-form-textarea-icon-right"
                    />
                    <div className="textarea-icon-bottom-right">
                      <Bot size={14} />
                    </div>
                  </div>
                </div>

                <div className="task-form-row">
                  <div className="task-form-col">
                    <label className="task-form-label">Start Date <span className="task-required-asterisk">*</span></label>
                    <div className="task-input-wrapper">
                      <div className="task-input-icon-left">
                        <Calendar size={16} />
                      </div>
                      <input
                        type="date"
                        name="ExpectedStartDate"
                        value={formData.ExpectedStartDate}
                        onChange={handleChange}
                        onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                        required
                        className="task-form-input task-form-input-with-icon-left"
                      />
                    </div>
                  </div>
                  <div className="task-form-col">
                    <label className="task-form-label">Due Date <span className="task-required-asterisk">*</span></label>
                    <div className="task-input-wrapper">
                      <div className="task-input-icon-left">
                        <Calendar size={16} />
                      </div>
                      <input
                        type="date"
                        name="ExpectedDueDate"
                        value={formData.ExpectedDueDate}
                        onChange={handleChange}
                        onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                        required
                        className="task-form-input task-form-input-with-icon-left"
                      />
                    </div>
                  </div>
                </div>

                <div className="task-form-group">
                  <label className="task-form-label">Client <span className="task-required-asterisk">*</span></label>
                  <SearchableCombobox
                    options={clientOptions}
                    value={formData.ClientCaseFileID}
                    onChange={(val) => handleComboboxChange('ClientCaseFileID', val)}
                    placeholder="Search for a client..."
                    required
                    icon={<User size={16} />}
                  />
                  {fieldErrors['Task.ClientCaseFileID'] && <span className="task-field-error">{fieldErrors['Task.ClientCaseFileID'].MESSAGE}</span>}
                </div>

                <div className="task-form-group-sm">
                  <label className="task-form-label">Assign To</label>
                  <SearchableCombobox
                    options={staffOptions}
                    value={formData.AssignTo}
                    onChange={(val) => handleComboboxChange('AssignTo', val)}
                    placeholder="Search staff members..."
                    icon={<User size={16} />}
                  />
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
                  disabled={loading}
                  className="task-btn-submit"
                >
                  <Save size={16} /> {loading ? 'Saving...' : 'Save Task'}
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
