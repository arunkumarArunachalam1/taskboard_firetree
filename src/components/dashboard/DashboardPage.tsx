import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Header';
import KpiGrid from './KpiGrid';
import ChartsSection from './ChartsSection';
import TaskTable from './TaskTable';
import { FilterPanel } from './FilterPanel';
import { useDashboard } from '../../hooks/useDashboard';
import { useAppContext } from '../../context/AppContext';
import type { DashboardFilters } from '../../types/dashboard.types';

const DashboardPage: React.FC = () => {
  const {
    summary, loadingSummary,
    charts, loadingCharts,
    tasks, loadingTasks, page, pageSize, fetchTasks, fetchSummary, fetchCharts, handleHardRefresh,
    search, sortColumn, sortDir, listingFilters, setListingFilters, kpiFilters, setKpiFilters,
    error, setError
  } = useDashboard();
  const context = useAppContext();

  const [isFilterOpen, setIsFilterOpen] = useState(false);

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

  const adminRoles = new Set([
    'admin',
    'administrator',
    'facility director',
  ]);

  const hasAdminPrivileges = Object.keys(context.roles ?? {}).some(role =>
    adminRoles.has(role.toLowerCase())
  );

  const handleKpiApplyFilters = async (newKpiFilters: DashboardFilters) => {
    try {
      setKpiFilters(newKpiFilters);
      setIsFilterOpen(false);
      await Promise.all([
        fetchSummary(newKpiFilters),
        fetchCharts(newKpiFilters)
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to apply KPI filters");
    }
  };

  const handleListingApplyFilters = async (newListingFilters: DashboardFilters) => {
    try {
      setListingFilters(newListingFilters);
      await fetchTasks(1, undefined, undefined, undefined, undefined, newListingFilters);
    } catch (err: any) {
      setError(err.message || "Failed to apply task filters");
    }
  };

  const handleKpiClearFilters = async () => {
    try {
      const defaultKpiFilters: DashboardFilters = {
        assignedTo: '',
        role: '',
        status: 'all',
        taskType: '',
        startDate: '',
        endDate: ''
      };
      setKpiFilters(defaultKpiFilters);
      await Promise.all([
        fetchSummary(defaultKpiFilters),
        fetchCharts(defaultKpiFilters)
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to clear KPI filters");
    }
  };

  const handleListingClearFilters = async () => {
    try {
      const clearedListingFilters: DashboardFilters = {
        assignedTo: '',
        role: '',
        status: 'all',
        taskType: '',
        startDate: '',
        endDate: ''
      };
      setListingFilters(clearedListingFilters);
      await fetchTasks(1, undefined, undefined, undefined, undefined, clearedListingFilters);
    } catch (err: any) {
      setError(err.message || "Failed to clear task filters");
    }
  };



  return (
    <div className={`min-h-screen ${isIntegrated ? 'bg-transparent' : 'bg-gray-100'}`}>
      <Navbar />
      <div className="page-content">
        <div style={{ marginBottom: '20px', padding: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--gray-text)', fontWeight: 500 }}>
            Welcome, {displayUser.firstName} {displayUser.lastName} ({displayUser.role})
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            {hasAdminPrivileges && (
              <button
                className="btn-filters"
                onClick={handleHardRefresh}
                title="Refresh KPI and Charts"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            )}
            <button className="btn-filters" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <SlidersHorizontal size={15} />
              KPI & Chart Filters
            </button>
          </div>
        </div>

        <FilterPanel
          isOpen={isFilterOpen}
          filters={kpiFilters}
          onApply={handleKpiApplyFilters}
          onClear={handleKpiClearFilters}
          title="KPI & Graph Filters"
        />

        {/* {getActiveFilterTags().length > 0 && (
          <div className="active-filters-container">
            <span className="active-filters-label">Active Filters:</span>
            {getActiveFilterTags().map(tag => (
              <div key={tag.key} className="active-filter-tag">
                {tag.label}
                <X 
                  size={12} 
                  className="active-filter-close"
                  onClick={() => removeFilter(tag.key as keyof DashboardFilters)} 
                />
              </div>
            ))}
            <button 
              onClick={handleClearFilters} 
              className="btn-clear-filters"
            >
              Clear All
            </button>
          </div>
        )} */}

        <KpiGrid data={summary} loading={loadingSummary} />

        <ChartsSection data={charts} loading={loadingCharts} />
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
          onRefresh={handleHardRefresh}
          listingFilters={listingFilters}
          onApplyFilters={handleListingApplyFilters}
          onClearFilters={handleListingClearFilters}
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
