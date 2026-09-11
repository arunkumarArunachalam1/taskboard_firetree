import React, { useState, useRef, useCallback } from 'react';

interface FormattedDateInputProps {
  value: string;
  onChange: (val: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
}

/**
 * A date input that always displays MM/DD/YYYY format to the user,
 * regardless of their browser/OS locale settings.
 * Internally stores and emits dates in YYYY-MM-DD format.
 *
 * Strategy: renders a read-only text input for display and swaps it for
 * a real type="date" input on click. The ref callback fires synchronously
 * when the date input mounts, so showPicker() is called within the same
 * user-gesture activation window — no setTimeout or useEffect needed.
 */
const FormattedDateInput: React.FC<FormattedDateInputProps> = ({
  value,
  onChange,
  min,
  max,
  required,
  className = 'task-form-input task-form-input-with-icon-left task-form-input-h38',
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = React.useMemo(() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`; // MM/DD/YYYY
    }
    return value;
  }, [value]);

  // Ref callback: fires synchronously the moment the date <input> is inserted
  // into the DOM — still within the browser's user-gesture activation window.
  const dateInputRefCallback = useCallback((el: HTMLInputElement | null) => {
    if (el) {
      el.focus();
      if ('showPicker' in HTMLInputElement.prototype) {
        try { (el as any).showPicker(); } catch (_) {}
      }
    }
  }, []);

  const handleBlur = () => {
    // Small delay to allow date selection click to register before hiding
    blurTimeoutRef.current = setTimeout(() => {
      setIsPickerOpen(false);
    }, 150);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    // Keep picker open until blur (user may want to see selected date briefly)
  };

  if (isPickerOpen || !value) {
    // Render the real date picker input
    return (
      <input
        ref={dateInputRefCallback}
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={handleChange}
        onBlur={handleBlur}
        className={className}
        style={{ cursor: 'pointer' }}
      />
    );
  }

  // Render a display-only text input showing MM/DD/YYYY
  return (
    <input
      type="text"
      value={displayValue}
      readOnly
      placeholder="MM/DD/YYYY"
      required={required}
      onFocus={() => setIsPickerOpen(true)}
      onClick={() => setIsPickerOpen(true)}
      className={className}
      style={{ cursor: 'pointer' }}
    />
  );
};

export default FormattedDateInput;
