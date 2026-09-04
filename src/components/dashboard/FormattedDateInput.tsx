import React, { useState } from 'react';

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
 */
const FormattedDateInput: React.FC<FormattedDateInputProps> = ({
  value,
  onChange,
  min,
  max,
  required,
  className = 'task-form-input task-form-input-with-icon-left task-form-input-h38',
}) => {
  const [focused, setFocused] = useState(false);
  const isMouseDown = React.useRef(false);

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
      type={focused || !value ? 'date' : 'text'}
      value={focused || !value ? value : displayValue}
      min={min}
      max={max}
      required={required}
      placeholder="MM/DD/YYYY"
      onMouseDown={() => {
        isMouseDown.current = true;
      }}
      onMouseUp={() => {
        isMouseDown.current = false;
      }}
      onFocus={() => {
        if (!isMouseDown.current) {
          setFocused(true);
        }
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => {
        setFocused(true);
        const el = e.currentTarget;
        if (el.type !== 'date') {
          try {
            el.type = 'date';
            el.value = value || '';
          } catch (err) {}
        }
        if ('showPicker' in HTMLInputElement.prototype) {
          try { el.showPicker(); } catch (err) {}
        }
      }}
      className={className}
      style={{ cursor: 'pointer' }}
    />
  );
};

export default FormattedDateInput;
