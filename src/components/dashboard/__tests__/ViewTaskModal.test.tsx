import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ViewTaskModal } from '../ViewTaskModal';
import * as dashboardService from '../../../services/dashboard.service';

vi.mock('../../../services/dashboard.service', () => ({
  getTaskDetails: vi.fn(),
  extractTextFromHTML: (html: string) => html,
}));

describe('ViewTaskModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    taskId: 1,
  };

  it('does not render when isOpen is false', () => {
    const { container } = render(<ViewTaskModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders loading state initially', () => {
    vi.mocked(dashboardService.getTaskDetails).mockReturnValue(new Promise(() => {}));
    render(<ViewTaskModal {...defaultProps} />);
    expect(screen.getByText(/Loading task details/i)).toBeInTheDocument();
  });

  it('renders task details correctly after fetching', async () => {
    vi.mocked(dashboardService.getTaskDetails).mockResolvedValue({
      TaskID: 1,
      Title: 'General Task Example',
      TaskType: 'General',
      AssignedTo: 'John Doe',
      Status: 'Pending',
      DueDate: '2026-08-27T00:00:00Z',
      DueTime: '10:00 AM',
      Description: 'This is a test description.',
      History: [],
    });

    render(<ViewTaskModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/General Task Example/i)).toBeInTheDocument();
    });

    expect(screen.getByText('This is a test description.')).toBeInTheDocument();
  });
});
