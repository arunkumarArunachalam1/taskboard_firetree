import { useState, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext.tsx'
import { FollowupCompleteModal } from './components/dashboard/FollowupCompleteModal.tsx'

declare global {
  interface Window {
    openReactFollowupModal?: (taskId: number | string, onSuccess?: () => void) => void;
  }
}

interface ModalState {
  isOpen: boolean;
  taskId: number | null;
  onSuccess?: () => void;
}

let openModalHandler: ((taskId: number, onSuccess?: () => void) => void) | null = null;
let pendingModalRequest: { taskId: number; onSuccess?: () => void } | null = null;
let modalRoot: Root | null = null;

function StandaloneFollowupModalHost() {
  const [state, setState] = useState<ModalState>(() => {
    if (pendingModalRequest) {
      const req = pendingModalRequest;
      pendingModalRequest = null;
      return { isOpen: true, taskId: req.taskId, onSuccess: req.onSuccess };
    }
    return { isOpen: false, taskId: null };
  });

  useEffect(() => {
    openModalHandler = (taskId: number, onSuccess?: () => void) => {
      setState({ isOpen: true, taskId, onSuccess });
    };
    return () => {
      openModalHandler = null;
    };
  }, []);

  if (!state.taskId) return null;

  return (
    <FollowupCompleteModal
      isOpen={state.isOpen}
      selectedTaskId={state.taskId}
      onClose={() => setState((prev) => ({ ...prev, isOpen: false }))}
      onSuccess={() => {
        state.onSuccess?.();
      }}
    />
  );
}

window.openReactFollowupModal = (taskId: number | string, onSuccess?: () => void) => {
  const numericTaskId = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
  if (!numericTaskId || Number.isNaN(numericTaskId)) return;

  if (openModalHandler) {
    openModalHandler(numericTaskId, onSuccess);
    return;
  }

  pendingModalRequest = { taskId: numericTaskId, onSuccess };

  if (!modalRoot) {
    let container = document.getElementById('react-followup-modal-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'react-followup-modal-root';
      document.body.appendChild(container);
    }
    modalRoot = createRoot(container);
    modalRoot.render(
      <AppProvider>
        <StandaloneFollowupModalHost />
      </AppProvider>,
    );
  }
};

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <AppProvider>
      <App />
    </AppProvider>,
  );
}