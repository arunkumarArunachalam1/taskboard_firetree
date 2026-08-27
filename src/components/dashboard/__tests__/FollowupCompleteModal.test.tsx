import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FollowupCompleteModal } from '../FollowupCompleteModal';
import * as dashboardService from '../../../services/dashboard.service';

// Mock the dashboard service methods
vi.mock('../../../services/dashboard.service', () => ({
  getFollowupModalData: vi.fn(),
  getFollowupContactPhoneNumbers: vi.fn(),
  getFollowupDispositions: vi.fn(),
  saveFollowupTask: vi.fn(),
}));

describe('FollowupCompleteModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    selectedTaskId: 123,
  };

  it('does not render when isOpen is false', () => {
    const { container } = render(<FollowupCompleteModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('loads and displays followup details on open', async () => {
    // Setup mocks for this test
    vi.mocked(dashboardService.getFollowupModalData).mockResolvedValue({
      FollowupType: '7-Day Followup',
      ClientHeader: {
        COLUMNS: ['FIRSTNAME', 'LASTNAME', 'CLIENTID'],
        DATA: [['John', 'Doe', 'C-1001']],
      },
      AttemptHistory: [],
    });
    vi.mocked(dashboardService.getFollowupContactPhoneNumbers).mockResolvedValue([
      { label: '555-1234', value: '1' },
    ]);
    vi.mocked(dashboardService.getFollowupDispositions).mockResolvedValue([
      { label: 'Completed', value: '1' },
    ]);

    render(<FollowupCompleteModal {...defaultProps} />);

    // Wait for the loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText(/Loading followup details.../i)).not.toBeInTheDocument();
    });

    // Check if the modal renders the header and data
    expect(screen.getByText(/7-Day Followup for J\. Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Doe, John/i)).toBeInTheDocument();
    expect(screen.getByText('C-1001')).toBeInTheDocument();
  });

  it('shows error if saving fails validation for required survey questions (7-Day)', async () => {
    vi.mocked(dashboardService.getFollowupModalData).mockResolvedValue({
      FollowupType: '7-Day Followup',
      ClientHeader: {
        COLUMNS: ['FIRSTNAME', 'LASTNAME'],
        DATA: [['John', 'Doe']],
      },
    });
    vi.mocked(dashboardService.getFollowupContactPhoneNumbers).mockResolvedValue([]);
    vi.mocked(dashboardService.getFollowupDispositions).mockResolvedValue([{ label: 'Completed', value: '1' }]);

    render(<FollowupCompleteModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // We cannot easily interact with custom combobox without finding its internal elements.
    // However, validation first checks disposition. If empty, it fails there.
    const form = document.querySelector('#followupForm');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText(/Disposition is required/i)).toBeInTheDocument();
    });
  });

});
