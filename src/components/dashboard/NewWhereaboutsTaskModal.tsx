import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFacilityStaff, getClientList, getClientEventDestinations, getClientContacts, getContactMethods, saveWhereaboutsTask, getContactPhoneNumbers } from '../../services/dashboard.service';

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
  const displayValue = isOpen ? search : (selectedOption ? selectedOption.label : '');

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.secondary && o.secondary.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
          if (e.target.value === '') onChange('');
        }}
        onFocus={() => { setIsOpen(true); setSearch(''); }}
        placeholder={placeholder}
        style={{ width: '100%', padding: '8px 30px 8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box', backgroundColor: '#fff', cursor: 'pointer' }}
      />
      <div 
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}
      >
        <ChevronDown size={16} />
      </div>
      {required && !value && <input type="text" style={{ opacity: 0, position: 'absolute', height: 0, width: 0, pointerEvents: 'none' }} required />}

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 200, overflowY: 'auto',
          backgroundColor: '#fff', border: '1px solid #D1D5DB', borderRadius: 6, marginTop: 4, zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <div
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false); setSearch(''); }}
                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div>{option.label}</div>
                {option.secondary && <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{option.secondary}</div>}
              </div>
            ))
          ) : (
            <div style={{ padding: '8px 12px', color: '#6B7280', fontStyle: 'italic' }}>No matches found</div>
          )}
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

      Promise.all([
        getClientList().catch(e => { console.error("getClientList failed:", e); return []; }),
        getContactMethods().catch(e => { console.error("getContactMethods failed:", e); return []; }),
        getFacilityStaff().catch(e => { console.error("getFacilityStaff failed:", e); return []; })
      ]).then(([clientList, methodList, staffList]) => {
        console.log("[NewWhereaboutsTaskModal] Raw API responses:", { clientList, methodList, staffList });

        try {
          setClients((clientList || []).map((c: any) => ({
            value: c.value ?? c.VALUE ?? 0,
            label: c.display ?? c.DISPLAY ?? 'Unknown Client',
            clientId: c.clientId ?? c.CLIENTID ?? 0
          })));
          setMethods((methodList || []).map((m: any) => ({
            value: m.value ?? m.VALUE ?? m.Value ?? 0,
            label: String(m.label ?? m.LABEL ?? m.Label ?? 'Unknown Method')
          })));
          setStaff((staffList || []).map((s: any) => ({ value: s.Value ?? s.VALUE ?? s.value ?? 0, label: s.Display ?? s.DISPLAY ?? s.display ?? '' })));
        } catch (mappingError) {
          console.error("Error mapping dropdown options:", mappingError);
        }

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
          value: c.value ?? c.VALUE ?? c.Value ?? 0,
          label: c.label ?? c.LABEL ?? c.Label ?? 'Unknown Contact',
          phone: c.phone ?? c.PHONE ?? c.Phone ?? ''
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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>Create Whereabouts Task</h2>
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
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Client *</label>
                  <SearchableCombobox options={clients} value={clientId} onChange={setClientId} placeholder="Search for a client..." required />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Method *</label>
                  <SearchableCombobox options={methods} value={methodId} onChange={setMethodId} placeholder="Select a method..." required />
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Expected Start Date *</label>
                    <input
                      type="date"
                      value={expectedStartDate}
                      onChange={e => setExpectedStartDate(e.target.value)}
                      onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Time *</label>
                    <input
                      type="time"
                      value={expectedStartTime}
                      onChange={e => setExpectedStartTime(e.target.value)}
                      onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Expected End Date *</label>
                    <input
                      type="date"
                      value={expectedEndDate}
                      onChange={e => setExpectedEndDate(e.target.value)}
                      onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Time *</label>
                    <input
                      type="time"
                      value={expectedEndTime}
                      onChange={e => setExpectedEndTime(e.target.value)}
                      onClick={(e) => { try { (e.target as any).showPicker?.(); } catch(err) {} }}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Today's Destinations *</label>
                  <SearchableCombobox options={destinations} value={destinationId} onChange={setDestinationId} placeholder="Select an event destination..." required />
                  {!clientId && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Select a client first to see destinations.</div>}
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Contact Name *</label>
                    <SearchableCombobox options={contacts.map(c => ({ value: c.value, label: c.label }))} value={contactId} onChange={setContactId} placeholder="Select a contact..." required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Phone Number</label>
                    <SearchableCombobox options={contactPhoneNumbers} value={phoneNumber} onChange={(val) => setPhoneNumber(String(val))} placeholder="Select a phone number..." />
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Assign To</label>
                  <SearchableCombobox options={staff} value={assignedTo} onChange={setAssignedTo} placeholder="Search staff members..." />
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
                  disabled={isSubmitting}
                  style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#2563EB', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 500 }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Task'}
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
