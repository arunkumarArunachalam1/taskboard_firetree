import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewGeneralTaskModal } from '../NewGeneralTaskModal';
import * as dashboardService from '../../../services/dashboard.service';
import * as AppContextModule from '../../../context/AppContext';

vi.mock('../../../services/dashboard.service', () => ({
  getFacilityStaff: vi.fn().mockResolvedValue([]),
  getClientList: vi.fn().mockResolvedValue([]),
  saveGeneralTask: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../../context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

describe('NewGeneralTaskModal', () => {
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
    const { container } = render(<NewGeneralTaskModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when open and fetches initial data', async () => {
    vi.mocked(dashboardService.getFacilityStaff).mockResolvedValue([{ Value: 1, Display: 'John Doe', IsInactive: 0 }]);
    vi.mocked(dashboardService.getClientList).mockResolvedValue([{ value: '100', label: 'Client A' }]);

    render(<NewGeneralTaskModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/New General Task/i)).toBeInTheDocument();
    });

    expect(dashboardService.getFacilityStaff).toHaveBeenCalledWith(1);
    expect(dashboardService.getClientList).toHaveBeenCalledWith(1);
  });
});
