import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Header';
import KpiGrid from './KpiGrid';
// import ChartsSection from './ChartsSection';
import TaskTable from './TaskTable';
import { useDashboard } from '../../hooks/useDashboard';
import { useAppContext } from '../../context/AppContext';

const DashboardPage: React.FC = () => {
  const {
    summary, loadingSummary,
    // charts, loadingCharts,
    tasks, loadingTasks, page, pageSize, fetchTasks, fetchSummary,
    search, sortColumn, sortDir,
    error, setError
  } = useDashboard();
  const context = useAppContext();

  const isIntegrated = typeof window !== 'undefined' && (window.location.port !== '5173' || !!(window as any).__IS_INTEGRATED__);

  let primaryRole = Object.keys(context.roles)[0] || 'Staff';
  for (const roleName in context.roles) {
    const roleDetails = context.roles[roleName] as any;
    if (roleDetails && typeof roleDetails === 'object') {
      const isPrimary = Object.keys(roleDetails).some(
        k => k.toLowerCase() === 'primary' && (roleDetails[k] === 1 || roleDetails[k] === '1' || roleDetails[k] === true || String(roleDetails[k]).toLowerCase() === 'true')
      );
      if (isPrimary) {
        primaryRole = roleName;
        break;
      }
    }
  }

  const displayUser = {
    firstName: context.firstName,
    lastName: context.lastName,
    role: primaryRole
  };

  return (
    <div className={`min-h-screen ${isIntegrated ? 'bg-transparent' : 'bg-gray-100'}`}>
      <Navbar />
      <div className="page-content">
        <div style={{ marginBottom: '20px', padding: '0' }}>
          <span style={{ fontSize: '14px', color: 'var(--gray-text)', fontWeight: 500 }}>
            Welcome, {displayUser.firstName} {displayUser.lastName} ({displayUser.role})
          </span>
        </div>

        <KpiGrid data={summary} loading={loadingSummary} />

        {/* <ChartsSection data={charts} loading={loadingCharts} /> */}
        <TaskTable
          data={tasks}
          loading={loadingTasks}
          page={page}
          pageSize={pageSize}
          onPageChange={fetchTasks}
          onPageSizeChange={(sz) => fetchTasks(1, undefined, undefined, undefined, sz)}
          search={search}
          onSearchChange={(s) => fetchTasks(1, s)}
          sortColumn={sortColumn}
          sortDir={sortDir}
          onSortChange={(col, dir) => fetchTasks(1, undefined, col, dir)}
          onRefresh={() => {
            fetchTasks(page);
            fetchSummary();
          }}
        />
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: '24px',
                right: '24px',
                zIndex: 2147483647,
                width: 'auto',
                minWidth: '320px',
                maxWidth: '400px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderLeft: '4px solid #EF4444',
                borderRadius: '8px',
                color: '#991B1B',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ flexShrink: 0, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                <AlertCircle size={20} strokeWidth={2.5} style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 500, lineHeight: 1.4 }}>
                {error}
              </div>
              <button
                onClick={() => setError(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#991B1B', padding: '2px', display: 'flex', flexShrink: 0 }}
                title="Dismiss"
              >
                <X size={18} strokeWidth={2.5} style={{ width: '18px', height: '18px' }} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default DashboardPage;
