import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown } from 'lucide-react';
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
}

const SearchableCombobox: React.FC<SearchableComboboxProps> = ({ options, value, onChange, placeholder, required }) => {
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
            ? <strong key={i} style={{ color: '#2563EB', backgroundColor: '#EFF6FF', padding: '0 2px', borderRadius: 2 }}>{part}</strong>
            : part
        )}
      </>
    );
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
          // If clearing out completely
          if (e.target.value === '') {
            onChange('');
          }
        }}
        onFocus={() => {
          setIsOpen(true);
          setSearch('');
        }}
        placeholder={placeholder}
        style={{ width: '100%', padding: '8px 30px 8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#fff', cursor: 'pointer' }}
      />
      <div 
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}
      >
        <ChevronDown size={16} />
      </div>
      {/* Hidden input to ensure required validation fires natively if empty */}
      {required && !value && <input type="text" style={{ opacity: 0, position: 'absolute', height: 0, width: 0, pointerEvents: 'none' }} required />}

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: 260,
          overflowY: 'auto',
          backgroundColor: '#fff',
          border: '1px solid #D1D5DB',
          borderRadius: 6,
          marginTop: 4,
          zIndex: 100000,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          {filteredOptions.length > 0 ? filteredOptions.map(option => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                setSearch('');
              }}
              style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ fontWeight: 500, color: '#111827', fontSize: 14 }}>{highlightMatch(option.label, search)}</div>
              {option.secondary && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Case File ID: {highlightMatch(option.secondary, search)}</div>}
            </div>
          )) : (
            <div style={{ padding: '12px', color: '#6B7280', fontSize: 14, textAlign: 'center' }}>
              No results found for "{search}"
            </div>
          )}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="modal-backdrop"
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000
            }}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="modal-content"
            style={{
              position: 'relative',
              backgroundColor: '#fff',
              borderRadius: 12,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '100%',
              maxWidth: 650,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              margin: '20px',
              zIndex: 1001
            }}
          >
            {/* Header (Fixed) */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>Create General Task</h2>
              <button onClick={onClose} type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                <X size={20} />
              </button>
            </div>

            {/* Form Wrapper */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>

              {/* Scrollable Form Body */}
              <div style={{ padding: 24, overflowY: 'auto', flex: 1, overflowX: 'hidden' }}>
                {error && (
                  <div style={{ padding: 12, backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
                    {error}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Task Name *</label>
                  <input
                    type="text"
                    name="TaskName"
                    value={formData.TaskName}
                    onChange={handleChange}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Description *</label>
                  <textarea
                    name="TaskDescription"
                    value={formData.TaskDescription}
                    onChange={handleChange}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box', minHeight: 80 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Start Date *</label>
                    <input
                      type="date"
                      name="ExpectedStartDate"
                      value={formData.ExpectedStartDate}
                      onChange={handleChange}
                      onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Due Date *</label>
                    <input
                      type="date"
                      name="ExpectedDueDate"
                      value={formData.ExpectedDueDate}
                      onChange={handleChange}
                      onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Client *</label>
                  <SearchableCombobox
                    options={clientOptions}
                    value={formData.ClientCaseFileID}
                    onChange={(val) => handleComboboxChange('ClientCaseFileID', val)}
                    placeholder="Search for a client..."
                    required
                  />
                  {fieldErrors['Task.ClientCaseFileID'] && <span style={{ color: '#DC2626', fontSize: 12, marginTop: 4, display: 'block' }}>{fieldErrors['Task.ClientCaseFileID'].MESSAGE}</span>}
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Assign To</label>
                  <SearchableCombobox
                    options={staffOptions}
                    value={formData.AssignTo}
                    onChange={(val) => handleComboboxChange('AssignTo', val)}
                    placeholder="Search staff members..."
                  />
                </div>
              </div>

              {/* Footer (Fixed) */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0, backgroundColor: '#fff', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #D1D5DB', backgroundColor: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#2563EB', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500 }}
                >
                  {loading ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
