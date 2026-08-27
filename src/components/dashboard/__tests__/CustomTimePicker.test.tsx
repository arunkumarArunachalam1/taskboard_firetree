
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CustomTimePicker } from '../FollowupCompleteModal';

describe('CustomTimePicker Component', () => {
  it('renders with the correct initial value formatted as 12-hour time', () => {
    const handleChange = vi.fn();
    render(<CustomTimePicker value="14:30" onChange={handleChange} />);
    
    // The component formats "14:30" to "02:30 PM" internally for the input
    const input = screen.getByPlaceholderText('--:--') as HTMLInputElement;
    expect(input.value).toBe('02:30 PM');
  });

  it('updates the 24-hour value when typing a valid time and blurring', async () => {
    const handleChange = vi.fn();
    render(<CustomTimePicker value="14:30" onChange={handleChange} />);
    
    const input = screen.getByPlaceholderText('--:--') as HTMLInputElement;
    
    // Clear the input and type a new time
    await userEvent.clear(input);
    await userEvent.type(input, '1:15 AM');
    
    // Blur the input to trigger the change
    fireEvent.blur(input);
    
    // It should call onChange with the 24-hour format of '1:15 AM' -> '01:15'
    expect(handleChange).toHaveBeenCalledWith('01:15');
  });

  it('opens the dropdown when focused', () => {
    const handleChange = vi.fn();
    render(<CustomTimePicker value="14:30" onChange={handleChange} />);
    
    const input = screen.getByPlaceholderText('--:--');
    fireEvent.focus(input);
    
    // Dropdown columns should become visible
    expect(screen.getByText('HH')).toBeInTheDocument();
    expect(screen.getByText('MM')).toBeInTheDocument();
  });

  it('selects a time from the dropdown correctly', () => {
    const handleChange = vi.fn();
    render(<CustomTimePicker value="14:30" onChange={handleChange} />);
    
    // Open dropdown
    const input = screen.getByPlaceholderText('--:--');
    fireEvent.focus(input);
    
    // Click '4' for hour
    const hourBtn = screen.getByText('4', { selector: 'button.timepicker-item-btn' });
    fireEvent.click(hourBtn);
    
    // The onChange should be called with 04:30 PM (16:30)
    expect(handleChange).toHaveBeenCalledWith('16:30');
  });
});
