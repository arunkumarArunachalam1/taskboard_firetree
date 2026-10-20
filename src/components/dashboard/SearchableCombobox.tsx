import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

export interface ComboboxOption {
  value: string | number;
  label: string;
  secondary?: string;
  [key: string]: any;
}

export const ComboboxOption = {};


export interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string | number;
  onChange: (val: string | number) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query || !query.trim() || !text) {
    return text;
  }

  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return text;
  }

  const escapedTerms = Array.from(new Set(terms))
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = text.split(regex);

  if (parts.length <= 1) {
    return text;
  }

  const termsLower = new Set(terms.map((t) => t.toLowerCase()));

  return (
    <>
      {parts.map((part, index) =>
        termsLower.has(part.toLowerCase()) ? (
          <span key={index} className="combobox-highlight">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  required,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  const filteredOptions = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.secondary && o.secondary.toLowerCase().includes(search.toLowerCase()))
  );

  // Keep highlightedIndex valid when search or filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search, options]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && optionRefs.current[highlightedIndex]) {
      const el = optionRefs.current[highlightedIndex];
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const selectOption = (opt: ComboboxOption) => {
    onChange(opt.value);
    setIsOpen(false);
    setSearch('');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Prevent triggering parent form submit across modals
      e.preventDefault();
      e.stopPropagation();

      if (filteredOptions.length > 0) {
        const targetOption =
          highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
            ? filteredOptions[highlightedIndex]
            : filteredOptions[0];
        selectOption(targetOption);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      setSearch('');
      return;
    }

    if (e.key === 'Tab') {
      setIsOpen(false);
      setSearch('');
    }
  };

  return (
    <div ref={wrapperRef} className="combobox-container">
      <div
        className={`combobox-input combobox-input-flex ${icon ? 'task-form-input-with-icon-left' : ''}`}
        tabIndex={0}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            setSearch('');
          } else {
            setIsOpen(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
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

      {/* Hidden input to ensure required validation fires natively if empty */}
      {required && !value && (
        <input
          type="text"
          className="combobox-hidden-input"
          required
          tabIndex={-1}
          aria-hidden="true"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        />
      )}

      {isOpen && (
        <div className="combobox-panel">
          <div className="combobox-search-header">
            <div className="combobox-search-input-wrapper">
              <Search size={14} className="combobox-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleSearchKeyDown}
                className="combobox-search-input"
              />
            </div>
          </div>
          <div className="combobox-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isSelected = String(option.value) === String(value);
                return (
                  <div
                    key={option.value}
                    ref={(el) => {
                      optionRefs.current[idx] = el;
                    }}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`combobox-option ${isHighlighted ? 'combobox-option-highlighted' : ''} ${
                      isSelected ? 'combobox-option-selected' : ''
                    }`}
                  >
                    <div className="combobox-option-label">
                      {highlightMatch(option.label, search)}
                    </div>
                    {option.secondary && (
                      <div className="combobox-option-secondary">
                        {highlightMatch(option.secondary, search)}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="combobox-empty">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
