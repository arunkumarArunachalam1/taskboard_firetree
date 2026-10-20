import React, { useRef, useEffect } from 'react';

interface FormattedDateInputProps {
  value: string;
  onChange: (val: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * A date input that always displays MM/DD/YYYY format to the user,
 * regardless of their browser/OS locale settings.
 * Internally stores and emits dates in YYYY-MM-DD format.
 *
 * Debug findings:
 * 1. showPicker() succeeds on click #1 via native addEventListener (bypassing React's batchedUpdates).
 * 2. User selects a date — the native input value changes.
 * 3. BUT the display never updates because pointerEvents:'none' on the date input prevents
 *    React's synthetic onChange from firing for the picker's change event.
 *
 * Fix: native 'change' addEventListener on the date input directly calls onChange,
 * bypassing React's event system entirely for both click and change events.
 */
const FormattedDateInput: React.FC<FormattedDateInputProps> = ({
  value,
  onChange,
  min,
  max,
  required,
  disabled = false,
  className = 'task-form-input task-form-input-with-icon-left task-form-input-h38',
}) => {
  const displayRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  // Keep onChange in a ref so the stable native listener always calls the latest version
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const displayValue = React.useMemo(() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`; // MM/DD/YYYY
    }
    return value;
  }, [value]);

  useEffect(() => {
    const displayEl = displayRef.current;
    const dateEl = dateRef.current;
    if (!displayEl || !dateEl || disabled) return;

    // Native click → open picker (bypasses React batchedUpdates, preserves user-gesture token)
    const handleClick = () => {
      dateEl.focus();
      if ('showPicker' in HTMLInputElement.prototype) {
        try { (dateEl as any).showPicker(); } catch (_) {}
      }
    };

    // Native change → call onChange directly (pointerEvents:none prevents React's synthetic
    // onChange from receiving change events fired by showPicker())
    const handleChange = () => {
      onChangeRef.current(dateEl.value);
    };

    // Keyboard accessibility: Enter/Space opens picker
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    displayEl.addEventListener('click', handleClick);
    displayEl.addEventListener('keydown', handleKey);
    dateEl.addEventListener('change', handleChange);

    return () => {
      displayEl.removeEventListener('click', handleClick);
      displayEl.removeEventListener('keydown', handleKey);
      dateEl.removeEventListener('change', handleChange);
    };
  }, [disabled]); // re-bind if disabled changes

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Hidden native date input — opened via showPicker(), reports changes via native listener */}
      <input
        ref={dateRef}
        type="date"
        defaultValue={value}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          zIndex: 0,
        }}
      />

      {/* Styled MM/DD/YYYY display — click/keydown handled via native listeners above */}
      <input
        ref={displayRef}
        type="text"
        value={displayValue}
        readOnly
        disabled={disabled}
        placeholder="MM/DD/YYYY"
        required={required && !value}
        className={className}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: disabled ? '#F3F4F6' : undefined,
          color: disabled ? '#4B5563' : undefined,
          position: 'relative',
          zIndex: 1,
          width: '100%'
        }}
      />
    </div>
  );
};

export default FormattedDateInput;
