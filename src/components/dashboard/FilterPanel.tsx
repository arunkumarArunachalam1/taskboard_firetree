import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronDown, X } from 'lucide-react';
import type { DashboardFilters, OptionItem, FacilityStaff } from '../../types/dashboard.types';
import { getFacilityStaff, getTaskTypes, getRoles } from '../../services/dashboard.service';
import { useAppContext } from '../../context/AppContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FilterPanelProps {
  isOpen: boolean;
  filters: DashboardFilters;
  onApply: (filters: DashboardFilters) => void;
  onClear: () => void;
  title?: string;
  layout?: '6col' | '3col';
  mode?: 'card' | 'inline';
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
      requestAnimationFrame(() => {
        requestAnimationFrame(() => searchRef.current?.focus());
      });
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
    <div ref={containerRef} className="searchable-dropdown-container">
      {/* ── Trigger ── */}
      <div className={`searchable-dropdown-trigger-container ${isActive ? 'active' : ''}`}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => { setOpen(o => !o); setFocused(true); }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
            if (e.key === 'Escape') { setOpen(false); setSearch(''); setFocused(false); }
          }}
          className="searchable-dropdown-trigger"
        >
          <span className={`searchable-dropdown-value ${value ? 'has-value' : ''}`}>
            {selectedLabel}
          </span>
        </button>

        <span className="searchable-dropdown-icons">
          {value && (
            <button
              type="button"
              title="Clear"
              onClick={e => { e.stopPropagation(); handleSelect(''); }}
              className="searchable-dropdown-clear"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
          <button
            type="button"
            onClick={() => { setOpen(o => !o); setFocused(true); }}
            className="searchable-dropdown-chevron-btn"
            tabIndex={-1}
          >
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={`searchable-dropdown-chevron ${open ? 'open' : ''}`}
            />
          </button>
        </span>
      </div>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="searchable-dropdown-panel">
          {/* Search row */}
          {searchable && (
            <div className="searchable-dropdown-search-row">
              <div className="searchable-dropdown-search-wrapper">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setOpen(false); setSearch(''); setFocused(false); }
                  }}
                  className={`searchable-dropdown-search-input ${search ? 'has-search-text' : ''}`}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                    className="searchable-dropdown-search-clear"
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="searchable-dropdown-list">
            <DropdownItem
              label={placeholder}
              isSelected={!value}
              onClick={() => handleSelect('')}
            />
            {filtered.length === 0 ? (
              <div className="searchable-dropdown-empty">
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`searchable-dropdown-item ${isSelected ? 'selected' : ''}`}
    >
      {label}
    </button>
  );
};

// ─── Formatted Date Input ─────────────────────────────────────────────────────
const FormattedDateInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  min?: string;
  max?: string;
}> = ({ value, onChange, min, max }) => {
  const [focused, setFocused] = useState(false);
  
  const displayValue = React.useMemo(() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`; // MM/DD/YYYY
    }
    return value;
  }, [value]);

  return (
    <input
      type={focused || value === '' ? "date" : "text"}
      value={focused || value === '' ? value : displayValue}
      min={min}
      max={max}
      placeholder="MM/DD/YYYY"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={e => onChange(e.target.value)}
      onClick={(e) => {
        if ('showPicker' in HTMLInputElement.prototype) {
          try { (e.target as HTMLInputElement).showPicker(); } catch (err) {}
        }
      }}
      className="filter-date-input"
    />
  );
};


// ─── FilterPanel ──────────────────────────────────────────────────────────────
export const FilterPanel: React.FC<FilterPanelProps> = ({ 
  isOpen, filters, onApply, onClear, title = "Filters", layout = '6col', mode = 'card' 
}) => {
  const [localFilters, setLocalFilters] = useState<DashboardFilters>(filters);
  const [staffList,    setStaffList]    = useState<FacilityStaff[]>([]);
  const [taskTypes,    setTaskTypes]    = useState<OptionItem[]>([]);
  const [roles,        setRoles]        = useState<OptionItem[]>([]);

  const { currentFacilityID } = useAppContext();

  useEffect(() => {
    const loadData = async () => {
      if (isOpen) {
        if (staffList.length === 0) {
          try { setStaffList(await getFacilityStaff(currentFacilityID)); } catch(e) { console.error(e); }
        }
        if (taskTypes.length === 0) {
          try { setTaskTypes(await getTaskTypes()); } catch(e) { console.error(e); }
        }
        if (roles.length === 0) {
          try { setRoles(await getRoles()); } catch(e) { console.error(e); }
        }
      }
    };
    loadData();
  }, [isOpen, currentFacilityID]);

  useEffect(() => { 
    setLocalFilters(filters); 
  }, [filters]);

  const set = (field: keyof DashboardFilters, value: string) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  };

  // Convert to generic DropdownOption lists
  const staffOptions: DropdownOption[] = [
    { value: 'unassigned', label: 'Unassigned' }, // Added Unassigned option
    ...staffList.map(s => ({ value: String(s.Value), label: s.Display }))
  ];
  const roleOptions:      DropdownOption[] = roles.map(r => ({ value: String(r.value), label: r.label }));
  const completedOptions: DropdownOption[] = [
    { value: '0', label: 'No' },
    { value: '1', label: 'Yes' },
  ];
  const taskTypeOptions: DropdownOption[] = taskTypes.map(t => ({ value: String(t.value), label: t.label }));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="filter-panel"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ overflow: 'visible' }}
        >
          {/* ── Filter Card ── */}
          <div className={`filter-panel-card ${mode === 'inline' ? 'is-inline' : ''}`}>

            {/* ── Header row: Title + Clear ── */}
            <div className={`filter-panel-header ${!title ? 'no-title' : ''}`}>
              {title && (
                <span className="filter-panel-title">
                  {title}
                </span>
              )}
              <button
                type="button"
                className="filter-panel-clear"
                onClick={() => onClear()}
              >
                Clear Filters
              </button>
            </div>

            {/* ── Uniform filter grid ── */}
            <div className={`filter-panel-grid ${layout === '3col' ? 'grid-3col' : 'grid-6col'}`}>

              {/* 1 — Assigned User */}
              <div className="filter-field">
                <label className="filter-label">Assigned User</label>
                <SearchableDropdown
                  options={staffOptions}
                  value={localFilters.assignedTo}
                  onChange={v => set('assignedTo', v)}
                  placeholder="All Users"
                  searchPlaceholder="Search users…"
                />
              </div>

              {/* 2 — Assigned Role */}
              <div className="filter-field">
                <label className="filter-label">Assigned Role</label>
                <SearchableDropdown
                  options={roleOptions}
                  value={localFilters.role}
                  onChange={v => set('role', v)}
                  placeholder="All Roles"
                  searchPlaceholder="Search roles…"
                />
              </div>

              {/* 3 — Completed */}
              <div className="filter-field">
                <label className="filter-label">Completed</label>
                <SearchableDropdown
                  options={completedOptions}
                  value={localFilters.status === 'all' ? '' : localFilters.status}
                  onChange={v => set('status', v === '' ? 'all' : v)}
                  placeholder="All"
                  searchable={false}
                />
              </div>

              {/* 4 — Task Type */}
              <div className="filter-field">
                <label className="filter-label">Task Type</label>
                <SearchableDropdown
                  options={taskTypeOptions}
                  value={localFilters.taskType}
                  onChange={v => set('taskType', v)}
                  placeholder="All Types"
                  searchPlaceholder="Search task types…"
                />
              </div>

              {/* 5 — Start Date */}
              <div className="filter-field">
                <label className="filter-label">Start Date</label>
                <div className="filter-date-wrapper">
                  <FormattedDateInput
                    value={localFilters.startDate}
                    max={localFilters.endDate || undefined}
                    onChange={v => set('startDate', v)}
                  />
                  {localFilters.startDate && (
                    <button
                      type="button"
                      onClick={() => set('startDate', '')}
                      className="searchable-dropdown-search-clear date-clear-icon"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>

              {/* 6 — End Date */}
              <div className="filter-field">
                <label className="filter-label">End Date</label>
                <div className="filter-date-wrapper">
                  <FormattedDateInput
                    value={localFilters.endDate}
                    min={localFilters.startDate || undefined}
                    onChange={v => set('endDate', v)}
                  />
                  {localFilters.endDate && (
                    <button
                      type="button"
                      onClick={() => set('endDate', '')}
                      className="searchable-dropdown-search-clear date-clear-icon"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* ── Action buttons — right-aligned ── */}
            <div className="filter-actions">
              {/* Apply Filters */}
              <button
                type="button"
                className="btn-apply-filters"
                onClick={() => {
                  if (localFilters.startDate && localFilters.endDate && new Date(localFilters.startDate) > new Date(localFilters.endDate)) {
                    alert('Start date cannot be after end date.');
                    return;
                  }
                  onApply(localFilters);
                }}
              >
                <Filter size={12} strokeWidth={2} />
                Apply Filters
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
