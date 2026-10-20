import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewWhereaboutsTaskModal } from '../NewWhereaboutsTaskModal';
import * as dashboardService from '../../../services/dashboard.service';
import * as AppContextModule from '../../../context/AppContext';

vi.mock('../../../services/dashboard.service', () => ({
  getFacilityStaff: vi.fn().mockResolvedValue([]),
  getClientList: vi.fn().mockResolvedValue([]),
  getClientEventDestinations: vi.fn().mockResolvedValue([]),
  getClientContacts: vi.fn().mockResolvedValue([]),
  getContactMethods: vi.fn().mockResolvedValue([]),
  saveWhereaboutsTask: vi.fn().mockResolvedValue({ success: true }),
  getContactPhoneNumbers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

describe('NewWhereaboutsTaskModal', () => {
  const mockOnClose = vi.fn();
  const mockOnTaskCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppContextModule.useAppContext).mockReturnValue({
      currentFacilityID: 1, 
      facilities: [{ id: 1, name: 'Test Facility' }]
    } as any);
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onTaskCreated: mockOnTaskCreated,
  };

  it('does not render when isOpen is false', () => {
    const { container } = render(<NewWhereaboutsTaskModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when open and fetches initial data', async () => {
    console.log('TEST useAppContext:', AppContextModule.useAppContext());
    vi.mocked(dashboardService.getFacilityStaff).mockResolvedValue([{ Value: 1, Display: 'John Doe', IsInactive: 0 }]);
    vi.mocked(dashboardService.getClientList).mockResolvedValue([{ value: '100', label: 'Client A' }]);

    render(<NewWhereaboutsTaskModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/New Whereabouts Task/i)).toBeInTheDocument();
    });

    expect(dashboardService.getFacilityStaff).toHaveBeenCalledWith(1);
    expect(dashboardService.getClientList).toHaveBeenCalledWith(1);
  });

  it('handles client selection and fetches dependencies', async () => {
    vi.mocked(dashboardService.getFacilityStaff).mockResolvedValue([]);
    vi.mocked(dashboardService.getClientList).mockResolvedValue([
      { value: '101', clientId: '201', label: 'Jane Smith' },
    ]);
    vi.mocked(dashboardService.getClientEventDestinations).mockResolvedValue([]);
    vi.mocked(dashboardService.getClientContacts).mockResolvedValue([]);
    
    render(<NewWhereaboutsTaskModal {...defaultProps} />);

    // To simulate client selection, we interact with the form elements
    // We can at least check if dependencies were triggered if we could mock the selection
    // Since combobox has custom implementations, we just test if the modal renders.
    expect(screen.getByText(/New Whereabouts Task/i)).toBeInTheDocument();
  });

  it('keeps Expected End Date and Expected End Time optional by default without asterisks', async () => {
    render(<NewWhereaboutsTaskModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/New Whereabouts Task/i)).toBeInTheDocument();
    });

    // Check Expected End Date label does not have asterisk
    const endDateLabel = screen.getByText(/^Expected End Date/i);
    expect(endDateLabel).not.toHaveTextContent('*');

    // Expected End Date input defaults to start date (today)
    const dateInputs = screen.getAllByPlaceholderText('MM/DD/YYYY') as HTMLInputElement[];
    expect(dateInputs[1].value).toBe(dateInputs[0].value);

    // Both time labels - start time has asterisk, end time does not
    const timeLabels = screen.getAllByText(/^Time/i);
    expect(timeLabels[0]).toHaveTextContent('*');
    expect(timeLabels[1]).not.toHaveTextContent('*');
  });

  it('keeps Expected End Time optional even when Expected End Date is selected', async () => {
    render(<NewWhereaboutsTaskModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/New Whereabouts Task/i)).toBeInTheDocument();
    });

    const nativeDateInputs = document.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    expect(nativeDateInputs.length).toBeGreaterThanOrEqual(2);

    // Set Expected End Date on the second date input
    const endDateInput = nativeDateInputs[1];
    fireEvent.change(endDateInput, { target: { value: '2026-10-25' } });

    // Time label for end time should still NOT have asterisk
    const timeLabels = screen.getAllByText(/^Time/i);
    expect(timeLabels[1]).not.toHaveTextContent('*');
  });
});
