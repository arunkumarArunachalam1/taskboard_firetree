import React from 'react';
import Navbar, { PageHeader } from './Header';
import KpiGrid from './KpiGrid';
import ChartsSection from './ChartsSection';
import TaskTable from './TaskTable';
import { useDashboard } from '../../hooks/useDashboard';

const DashboardPage: React.FC = () => {
  const {
    summary, loadingSummary,
    charts, loadingCharts,
    tasks, loadingTasks,
    page, fetchTasks,
  } = useDashboard();

  return (
    <>
      <Navbar user={summary?.user} />
      <div className="page-content">
        {/* <PageHeader user={summary?.user} onFilter={() => console.log('Filters clicked')} /> */}
        <KpiGrid data={summary} loading={loadingSummary} />
        <ChartsSection data={charts} loading={loadingCharts} />
        <TaskTable
          data={tasks}
          loading={loadingTasks}
          page={page}
          onPageChange={fetchTasks}
        />
      </div>
    </>
  );
};

export default DashboardPage;
