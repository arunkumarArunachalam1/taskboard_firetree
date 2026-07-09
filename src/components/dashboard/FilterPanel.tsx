import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, RotateCcw, Search, ChevronDown, X } from 'lucide-react';
import type { DashboardFilters, OptionItem, FacilityStaff } from '../../types/dashboard.types';
import { getFacilityStaff, getTaskTypes, getRoles } from '../../services/dashboard.service';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FilterPanelProps {
  isOpen: boolean;
  filters: DashboardFilters;
  onApply: (filters: DashboardFilters) => void;
  onClear: () => void;
}

interface DropdownOption {
  value: string;
  label: string;
}

// ─── Reusable Searchable Dropdown ─────────────────────────────────────────────
interface SearchableDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  searchable = true,
}) => {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef    = useRef<HTMLInputElement>(null);

  const selectedLabel = value
    ? options.find(o => o.value === value)?.label ?? placeholder
    : placeholder;

  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* focus search when panel opens */
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 40);
    }
  }, [open, searchable]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch('');
    setFocused(false);
  };

  const isActive = open || focused;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>

      {/* ── Trigger ── */}
      <div
        tabIndex={0}
        role="button"
        aria-expanded={open}
        onClick={() => { setOpen(o => !o); setFocused(true); }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
          if (e.key === 'Escape') { setOpen(false); setSearch(''); setFocused(false); }
        }}
        style={{
          width: '100%',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          padding: '0 10px',
          background: '#ffffff',
          border: isActive ? '1.5px solid #3B82F6' : '1px solid #D1D5DB',
          borderRadius: '8px',
          boxShadow: isActive ? '0 0 0 3px rgba(59,130,246,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
          cursor: 'pointer',
          userSelect: 'none',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <span style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '13px',
          color: value ? '#111827' : '#6B7280',
        }}>
          {selectedLabel}
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          {value && (
            <span
              title="Clear"
              onClick={e => { e.stopPropagation(); handleSelect(''); }}
              style={{
                display: 'flex', alignItems: 'center',
                color: '#9CA3AF', cursor: 'pointer', padding: '2px',
                borderRadius: '3px',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = '#EF4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = '#9CA3AF'; }}
            >
              <X size={11} strokeWidth={2.5} />
            </span>
          )}
          <ChevronDown
            size={14}
            strokeWidth={2}
            style={{
              color: isActive ? '#3B82F6' : '#6B7280',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.18s, color 0.15s',
            }}
          />
        </span>
      </div>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            zIndex: 99999,
            overflow: 'hidden',
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search row — reliable absolute-icon approach */}
          {searchable && (
            <div style={{
              padding: '8px',
              borderBottom: '1px solid #F3F4F6',
              flexShrink: 0,
              background: '#FAFAFA',
            }}>
              <div style={{ position: 'relative' }}>
                {/* Input — left-padded to clear icon */}
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setOpen(false); setSearch(''); setFocused(false); }
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '34px',
                    paddingLeft: '10px',
                    paddingRight: search ? '32px' : '10px',
                    border: '1.5px solid #E5E7EB',
                    borderRadius: '7px',
                    outline: 'none',
                    fontSize: '12.5px',
                    color: '#111827',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e  => { e.currentTarget.style.borderColor = '#3B82F6'; }}
                  onBlur={e   => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
                />
                {/* Clear search text button */}
                {search && (
                  <span
                    onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                    style={{
                      position: 'absolute',
                      right: '9px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center',
                      cursor: 'pointer', color: '#9CA3AF',
                    }}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Options list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <DropdownItem
              label={placeholder}
              isSelected={!value}
              onClick={() => handleSelect('')}
            />
            {filtered.length === 0 ? (
              <div style={{ padding: '14px 12px', fontSize: '12.5px', color: '#9CA3AF', textAlign: 'center' }}>
                No results found
              </div>
            ) : (
              filtered.map(opt => (
                <DropdownItem
                  key={opt.value}
                  label={opt.label}
                  isSelected={opt.value === value}
                  onClick={() => handleSelect(opt.value)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Dropdown option row ───────────────────────────────────────────────────────
const DropdownItem: React.FC<{ label: string; isSelected: boolean; onClick: () => void }> = ({
  label, isSelected, onClick,
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '9px 14px',
        fontSize: '13px',
        lineHeight: '1.3',
        cursor: 'pointer',
        color: isSelected ? '#2563EB' : '#374151',
        fontWeight: isSelected ? 600 : 400,
        background: isSelected
          ? '#EFF6FF'
          : hovered
          ? '#F5F7FA'
          : 'transparent',
        borderLeft: isSelected ? '3px solid #3B82F6' : '3px solid transparent',
        transition: 'background 0.1s',
        userSelect: 'none',
      }}
    >
      {label}
    </div>
  );
};

// ─── FilterPanel ──────────────────────────────────────────────────────────────
export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, filters, onApply, onClear }) => {
  const [localFilters, setLocalFilters] = useState<DashboardFilters>(filters);
  const [staffList,    setStaffList]    = useState<FacilityStaff[]>([]);
  const [taskTypes,    setTaskTypes]    = useState<OptionItem[]>([]);
  const [roles,        setRoles]        = useState<OptionItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (staffList.length === 0) getFacilityStaff().then(setStaffList).catch(console.error);
      if (taskTypes.length === 0) getTaskTypes().then(setTaskTypes).catch(console.error);
      if (roles.length     === 0) getRoles().then(setRoles).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => { setLocalFilters(filters); }, [filters]);

  const set = (field: keyof DashboardFilters, value: string) =>
    setLocalFilters(prev => ({ ...prev, [field]: value }));

  // Convert to generic DropdownOption lists
  const staffOptions:     DropdownOption[] = staffList.map(s => ({ value: String(s.Value), label: s.Display }));
  const roleOptions:      DropdownOption[] = roles.map(r => ({ value: String(r.value), label: r.label }));
  const completedOptions: DropdownOption[] = [
    { value: '0', label: 'No' },
    { value: '1', label: 'Yes' },
  ];
  const taskTypeOptions: DropdownOption[] = taskTypes.map(t => ({ value: String(t.value), label: t.label }));

  // ── Shared design tokens ────────────────────────────────────────────────────
  const FIELD_HEIGHT = '38px';
  const BORDER_RADIUS = '8px';
  const BORDER_COLOR = '#D1D5DB';
  const FOCUS_BORDER = '#3B82F6';
  const FOCUS_SHADOW = '0 0 0 3px rgba(59,130,246,0.12)';
  const INPUT_SHADOW = '0 1px 2px rgba(0,0,0,0.04)';

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '5px',
  };

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  // Date inputs must visually match the SearchableDropdown trigger
  const dateStyle: React.CSSProperties = {
    width: '100%',
    height: FIELD_HEIGHT,
    fontSize: '13px',
    padding: '0 10px',
    border: `1px solid ${BORDER_COLOR}`,
    borderRadius: BORDER_RADIUS,
    background: '#ffffff',
    color: '#111827',
    boxSizing: 'border-box',
    outline: 'none',
    cursor: 'pointer',
    boxShadow: INPUT_SHADOW,
    transition: 'border-color 0.15s, box-shadow 0.15s',
    // Match font so the date text looks the same weight as dropdown text
    fontFamily: 'inherit',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {/* ── Filter Card ── */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            padding: '18px 20px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            marginBottom: '20px',
            position: 'relative',
            zIndex: 100,
          }}>

            {/* ── Header row: title + Clear ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151', letterSpacing: '0.01em' }}>
                Filters
              </span>
              <span
                style={{ fontSize: '12.5px', color: '#2563EB', cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                onMouseDown={e => { e.preventDefault(); onClear(); }}
              >
                Clear Filters
              </span>
            </div>

            {/* ── Uniform 6-column filter grid ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '12px',
              alignItems: 'end',
            }}>

              {/* 1 — Assigned User */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Assigned User</label>
                <SearchableDropdown
                  options={staffOptions}
                  value={localFilters.assignedTo}
                  onChange={v => set('assignedTo', v)}
                  placeholder="All Users"
                  searchPlaceholder="Search users…"
                />
              </div>

              {/* 2 — Assigned Role */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Assigned Role</label>
                <SearchableDropdown
                  options={roleOptions}
                  value={localFilters.role}
                  onChange={v => set('role', v)}
                  placeholder="All Roles"
                  searchPlaceholder="Search roles…"
                />
              </div>

              {/* 3 — Completed */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Completed</label>
                <SearchableDropdown
                  options={completedOptions}
                  value={localFilters.status === 'all' ? '' : localFilters.status}
                  onChange={v => set('status', v === '' ? 'all' : v)}
                  placeholder="All"
                  searchable={false}
                />
              </div>

              {/* 4 — Task Type */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Task Type</label>
                <SearchableDropdown
                  options={taskTypeOptions}
                  value={localFilters.taskType}
                  onChange={v => set('taskType', v)}
                  placeholder="All Types"
                  searchPlaceholder="Search task types…"
                />
              </div>

              {/* 5 — Start Date */}
              <div style={fieldStyle}>
                <label style={labelStyle}>Start Date</label>
                <input
                  type="date"
                  value={localFilters.startDate}
                  onChange={e => set('startDate', e.target.value)}
                  style={dateStyle}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = FOCUS_BORDER;
                    e.currentTarget.style.boxShadow   = FOCUS_SHADOW;
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = BORDER_COLOR;
                    e.currentTarget.style.boxShadow   = INPUT_SHADOW;
                  }}
                />
              </div>

              {/* 6 — End Date */}
              <div style={fieldStyle}>
                <label style={labelStyle}>End Date</label>
                <input
                  type="date"
                  value={localFilters.endDate}
                  onChange={e => set('endDate', e.target.value)}
                  style={dateStyle}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = FOCUS_BORDER;
                    e.currentTarget.style.boxShadow   = FOCUS_SHADOW;
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = BORDER_COLOR;
                    e.currentTarget.style.boxShadow   = INPUT_SHADOW;
                  }}
                />
              </div>

            </div>

            {/* ── Action buttons — right-aligned ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>

              {/* Apply Filters */}
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  height: '24px',
                  padding: '0 8px',
                  borderRadius: BORDER_RADIUS,
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.12s, transform 0.1s',
                  userSelect: 'none',
                  fontFamily: 'inherit',
                  boxShadow: '0 1px 3px rgba(37,99,235,0.35)',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1D4ED8'; }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                  e.currentTarget.style.transform       = 'scale(1)';
                }}
                onMouseDown={e => {
                  e.currentTarget.style.transform       = 'scale(0.97)';
                  e.currentTarget.style.backgroundColor = '#1E40AF';
                }}
                onMouseUp={e => {
                  e.currentTarget.style.transform       = 'scale(1)';
                  e.currentTarget.style.backgroundColor = '#1D4ED8';
                  onApply(localFilters);
                }}
              >
                <Filter size={10} strokeWidth={2} />
                Apply Filters
              </button>

            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
