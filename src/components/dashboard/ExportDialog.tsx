import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, Info, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DashboardFilters } from '../../types/dashboard.types';
import { getFacilityStaff, getRoles, getTaskTypes } from '../../services/dashboard.service';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // Chart refs for PDF canvas capture
  chart7Ref?: React.RefObject<any>;
  chart30Ref?: React.RefObject<any>;
  chart90Ref?: React.RefObject<any>;
  chartPieRef?: React.RefObject<any>;
  facilityID?: string;
  userID?: string;
  isAdmin?: boolean;
  listingFilters?: DashboardFilters;
  kpiFilters?: DashboardFilters;
  facilityName?: string;
  showToast?: (message: string, type: 'info' | 'success' | 'error') => void;
  totalTasks?: number;
}

type ExportFormat = 'excel' | 'csv' | 'pdf';

const ExcelIcon = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 6H10C8.895 6 8 6.895 8 8V40C8 41.105 8.895 42 10 42H38C39.105 42 40 41.105 40 40V18L28 6Z" fill="#21A366" />
    <path d="M28 6V18H40L28 6Z" fill="#107C41" />
    <rect x="14" y="22" width="20" height="12" rx="1" fill="white" />
    <rect x="15" y="23" width="5" height="4" fill="#21A366" />
    <rect x="21.5" y="23" width="5" height="4" fill="#21A366" />
    <rect x="28" y="23" width="5" height="4" fill="#21A366" />
    <rect x="15" y="29" width="5" height="4" fill="#21A366" />
    <rect x="21.5" y="29" width="5" height="4" fill="#21A366" />
    <rect x="28" y="29" width="5" height="4" fill="#21A366" />
    <rect x="8" y="16" width="16" height="16" rx="2" fill="#107C41" />
    <path d="M12.5 28L15 24L12.5 20H15L16 22L17 20H19.5L17 24L19.5 28H17L16 26L15 28H12.5Z" fill="white" />
  </svg>
);

const CsvIcon = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* File body */}
    <path d="M28 6H10C8.895 6 8 6.895 8 8V40C8 41.105 8.895 42 10 42H38C39.105 42 40 41.105 40 40V18L28 6Z" fill="#43A047" />
    {/* Folded corner */}
    <path d="M28 6V18H40L28 6Z" fill="#2E7D32" />
    {/* CSV label badge */}
    <rect x="6" y="26" width="22" height="12" rx="2" fill="#1B5E20" />
    {/* C */}
    <path d="M11.5 35C10.1 35 9 33.9 9 32.5C9 31.1 10.1 30 11.5 30C12.2 30 12.8 30.3 13.2 30.7L12.4 31.5C12.1 31.2 11.8 31 11.5 31C10.7 31 10 31.7 10 32.5C10 33.3 10.7 34 11.5 34C11.8 34 12.1 33.8 12.4 33.5L13.2 34.3C12.8 34.7 12.2 35 11.5 35Z" fill="white" />
    {/* S */}
    <path d="M16.5 35C15.4 35 14.6 34.5 14.2 33.8L15 33.3C15.3 33.8 15.8 34 16.5 34C17.1 34 17.5 33.7 17.5 33.3C17.5 32.9 17.1 32.7 16.4 32.5C15.5 32.2 14.7 31.9 14.7 31C14.7 30.4 15.3 30 16.2 30C17.1 30 17.8 30.4 18.1 31L17.3 31.5C17.1 31.1 16.7 31 16.2 31C15.8 31 15.7 31.2 15.7 31.4C15.7 31.7 16.1 31.9 16.7 32.1C17.6 32.4 18.5 32.7 18.5 33.6C18.5 34.4 17.7 35 16.5 35Z" fill="white" />
    {/* V */}
    <path d="M21 30L22.2 33.5L23.4 30H24.5L22.7 35H21.7L20 30H21Z" fill="white" />
  </svg>
);

const PdfIcon = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 6H10C8.895 6 8 6.895 8 8V40C8 41.105 8.895 42 10 42H38C39.105 42 40 41.105 40 40V18L28 6Z" fill="#F44336" />
    <path d="M28 6V18H40L28 6Z" fill="#D32F2F" />
    <rect x="12" y="18" width="24" height="16" rx="2" fill="white" />
    <path d="M17.5 28.5V21.5H20.5C22 21.5 22.5 22.5 22.5 23.5C22.5 24.5 22 25.5 20.5 25.5H19V28.5H17.5ZM19 22.5V24.5H20C20.5 24.5 21 24.5 21 23.5C21 22.5 20.5 22.5 20 22.5H19Z" fill="#D32F2F" />
    <path d="M23.5 28.5V21.5H26.5C28.5 21.5 29.5 23 29.5 25C29.5 27 28.5 28.5 26.5 28.5H23.5ZM25 22.5V27.5H26C27.5 27.5 28 26.5 28 25C28 23.5 27.5 22.5 26 22.5H25Z" fill="#D32F2F" />
    <path d="M31 28.5V21.5H35V22.5H32.5V24.5H34.5V25.5H32.5V28.5H31Z" fill="#D32F2F" />
  </svg>
);

const formatLabels: Record<ExportFormat, string> = {
  excel: 'Excel (.xlsx)',
  csv: 'CSV (.csv)',
  pdf: 'PDF (.pdf)',
};

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen, onClose,
  chart7Ref, chart30Ref, chart90Ref, chartPieRef,
  facilityID = '', userID = '', isAdmin = false,
  listingFilters, kpiFilters, facilityName = 'All',
  showToast,
  totalTasks = 0
}) => {
  const isOverLimit = totalTasks > 50000;
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [exporting, setExporting] = useState(false);
  const [filterLabels, setFilterLabels] = useState<any>({});

  React.useEffect(() => {
    if (isOpen) {
      Promise.all([
        getFacilityStaff(facilityID).catch(() => []),
        getRoles().catch(() => []),
        getTaskTypes().catch(() => [])
      ]).then(([staffList, rolesList, taskTypesList]) => {
        const getName = (list: any[], val: any) => {
          if (!val || val === 'all') return 'All';
          const found = list.find((x: any) => String(x.value) === String(val) || String(x.id) === String(val));
          return found ? (found.label || found.name || found.Display || val) : val;
        };
        setFilterLabels({
          tableAssignedTo: getName(staffList, listingFilters?.assignedTo),
          tableRole: getName(rolesList, listingFilters?.role),
          tableTaskType: getName(taskTypesList, listingFilters?.taskType),
          
          kpiAssignedTo: getName(staffList, kpiFilters?.assignedTo),
          kpiRole: getName(rolesList, kpiFilters?.role),
          kpiTaskType: getName(taskTypesList, kpiFilters?.taskType)
        });
      });
    }
  }, [isOpen, facilityID, listingFilters, kpiFilters]);

  if (typeof document === 'undefined') return null;

  // ── Helpers ────────────────────────────────────────────────────────
  const formatToCFDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`;
    return dateStr;
  };

  const handleExport = async () => {
    if (isOverLimit || exporting) {
      if (isOverLimit && showToast) {
        showToast(
          `Too many rows (${totalTasks.toLocaleString()}). Please apply a date range or status filter and try again.`,
          'error'
        );
      }
      return;
    }

    setExporting(true);
    onClose();

    if (selectedFormat !== 'pdf') {
      const f = listingFilters;
      const k = kpiFilters;

      if (showToast) showToast('Preparing your export, please wait...', 'info');

      try {
        const body = new URLSearchParams({
          facilityID: facilityID || '',
          userID: userID || '',
          isAdmin: String(isAdmin),
          statusFilter: f?.status || 'all',
          fromDate: formatToCFDate(f?.startDate || ''),
          toDate: formatToCFDate(f?.endDate || ''),
          assignedTo: f?.assignedTo || '',
          role: f?.role || '',
          taskType: f?.taskType || '',
          tableAssignedToName: filterLabels.tableAssignedTo || 'All',
          tableRoleName: filterLabels.tableRole || 'All',
          tableTaskTypeName: filterLabels.tableTaskType || 'All',
          kpiStatusFilter: k?.status || 'all',
          kpiFromDate: formatToCFDate(k?.startDate || ''),
          kpiToDate: formatToCFDate(k?.endDate || ''),
          kpiAssignedTo: k?.assignedTo || '',
          kpiRole: k?.role || '',
          kpiTaskType: k?.taskType || '',
          kpiAssignedToName: filterLabels.kpiAssignedTo || 'All',
          kpiRoleName: filterLabels.kpiRole || 'All',
          kpiTaskTypeName: filterLabels.kpiTaskType || 'All',
          facilityName: facilityName || 'All',
          exportFormat: selectedFormat
        });

        const response = await fetch('/ReactTaskBoard/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (!response.ok) {
          if (response.status === 400) {
            const errorText = await response.text();
            if (errorText && errorText.trim()) {
              const cleanMsg = errorText.trim().replace(/\s+/g, ' ');
              setExporting(false);
              if (showToast) showToast(cleanMsg, 'error');
              return;
            }
          }
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let fileName = `tasks_export_${new Date().toISOString().slice(0,10)}.${selectedFormat === 'excel' ? 'xlsx' : 'csv'}`;
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) fileName = match[1];
        }
        
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        setExporting(false);
        if (showToast) showToast('Download completed successfully!', 'success');
      } catch (error) {
        console.error('Export error:', error);
        setExporting(false);
        if (showToast) showToast('Failed to download export.', 'error');
      }
      return;
    }

    // ── PDF export via CF hybrid approach ──────────────────────────
    if (showToast) showToast('Preparing your PDF export, please wait...', 'info');
    try {
      // Temporarily enable PDF export mode and 3x retina scaling on chart instances to draw crisp PDF charts
      const chartRefs = [chart7Ref, chart30Ref, chart90Ref, chartPieRef];
      chartRefs.forEach(r => {
        if (r?.current) {
          r.current._exportingPdf = true;
          r.current.options.devicePixelRatio = 1.5;
          r.current.resize();
          r.current.update('none');
        }
      });

      // Capture each chart canvas as a base64 PNG data URI
      const chart7img = chart7Ref?.current?.toBase64Image?.('image/png', 1.0) ?? '';
      const chart30img = chart30Ref?.current?.toBase64Image?.('image/png', 1.0) ?? '';
      const chart90img = chart90Ref?.current?.toBase64Image?.('image/png', 1.0) ?? '';
      const chartPieImg = chartPieRef?.current?.toBase64Image?.('image/png', 1.0) ?? '';

      // Restore normal UI mode and native screen resolution
      chartRefs.forEach(r => {
        if (r?.current) {
          r.current._exportingPdf = false;
          r.current.options.devicePixelRatio = window.devicePixelRatio || 1;
          r.current.resize();
          r.current.update('none');
        }
      });

      // Build filter params matching the dashboard service format
      const f = listingFilters;
      const body = new URLSearchParams({
        facilityID,
        userID,
        isAdmin: String(isAdmin),
        statusFilter: f?.status || 'all',
        fromDate: formatToCFDate(f?.startDate || ''),
        toDate: formatToCFDate(f?.endDate || ''),
        assignedTo: f?.assignedTo || '',
        role: f?.role || '',
        taskType: f?.taskType || '',
        tableAssignedToName: filterLabels.tableAssignedTo || 'All',
        tableRoleName: filterLabels.tableRole || 'All',
        tableTaskTypeName: filterLabels.tableTaskType || 'All',

        kpiStatusFilter: kpiFilters?.status || 'all',
        kpiFromDate: formatToCFDate(kpiFilters?.startDate || ''),
        kpiToDate: formatToCFDate(kpiFilters?.endDate || ''),
        kpiAssignedTo: kpiFilters?.assignedTo || '',
        kpiRole: kpiFilters?.role || '',
        kpiTaskType: kpiFilters?.taskType || '',
        kpiAssignedToName: filterLabels.kpiAssignedTo || 'All',
        kpiRoleName: filterLabels.kpiRole || 'All',
        kpiTaskTypeName: filterLabels.kpiTaskType || 'All',

        facilityName: facilityName,

        chart7img,
        chart30img,
        chart90img,
        chartPieImg,
      });

      const response = await fetch('/ReactTaskBoard/exportPdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'include',
        body,
      });

      if (!response.ok) {
        if (response.status === 400) {
          const errorText = await response.text();
          if (errorText && errorText.trim()) {
            const cleanMsg = errorText.trim().replace(/\s+/g, ' ');
            setExporting(false);
            if (showToast) showToast(cleanMsg, 'error');
            return;
          }
        }
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      // Trigger browser download from blob response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExporting(false);
      if (showToast) showToast('PDF Download completed successfully!', 'success');
    } catch (error: any) {
      console.error('PDF export error:', error);
      setExporting(false);
      if (showToast) showToast('Failed to download PDF export.', 'error');
    }
  };

  const formats: { id: ExportFormat; label: string; ext: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'excel', label: 'Excel', ext: '.xlsx', desc: 'Rich workbook with formatting, multiple sheets and tables.', icon: <ExcelIcon size={44} /> },
    { id: 'csv', label: 'CSV', ext: '.csv', desc: 'Raw tabular data for analysis.', icon: <CsvIcon size={44} /> },
    { id: 'pdf', label: 'PDF', ext: '.pdf', desc: 'Printable report with KPIs and charts.', icon: <PdfIcon size={44} /> },
  ];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="task-modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div onClick={exporting ? undefined : onClose} className="task-modal-backdrop" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="export-dialog-content"
          >
            {/* Header */}
            <div className="export-dialog-header">
              <div className="export-dialog-title-group">
                <div className="export-dialog-icon-container">
                  <Download size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="export-dialog-title">Export Dashboard Data</h2>
                  <p className="export-dialog-subtitle">Choose what you want to export, select a format, and download the report.</p>
                </div>
              </div>
              <button onClick={exporting ? undefined : onClose} disabled={exporting} type="button" className="task-modal-close" style={exporting ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="export-dialog-body">
              {isOverLimit && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div style={{
                    padding: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    marginTop: '2px',
                    flexShrink: 0
                  }}>
                    <Info size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>
                      Row Limit Exceeded ({totalTasks.toLocaleString()} rows)
                    </div>
                    <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '4px', lineHeight: '1.4' }}>
                      You cannot export more than 50,000 tasks at once. Please apply a date range or status filter to reduce the count before exporting.
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1 */}
              <div className="export-section-header">
                <span className="export-section-title">Choose export format</span>
              </div>

              <div className="export-format-grid-h">
                {formats.map(fmt => (
                  <div
                    key={fmt.id}
                    className={`export-format-row${selectedFormat === fmt.id ? ' export-format-row-active' : ''}`}
                    onClick={() => !exporting && setSelectedFormat(fmt.id)}
                    style={exporting ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                  >
                    {selectedFormat === fmt.id && (
                      <div className="export-row-checkmark">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <div className="export-row-icon">
                      {fmt.icon}
                    </div>
                    <div className="export-row-content">
                      <div className="export-row-title">
                        {fmt.label} <span className="export-row-ext">{fmt.ext}</span>
                      </div>
                      <div className="export-row-desc">{fmt.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Footer */}
            <div className="export-dialog-footer">
              <div className="export-summary-pill">
                <Info size={16} className="export-summary-icon" />
                <div>
                  <div className="export-summary-label">Export summary</div>
                  <div className="export-summary-value">
                    Format: {formatLabels[selectedFormat]}&nbsp;&nbsp;•&nbsp;&nbsp;Includes: KPI, Charts, Task Table
                  </div>
                </div>
              </div>
              <div className="export-footer-actions">
                <button onClick={exporting ? undefined : onClose} disabled={exporting} className="export-btn-cancel" style={exporting ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>Cancel</button>
                <button
                  className="export-btn-confirm"
                  onClick={handleExport}
                  disabled={exporting || isOverLimit}
                  style={(exporting || isOverLimit) ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#9CA3AF' } : undefined}
                  title={isOverLimit ? 'Cannot export more than 50,000 rows. Please apply a filter.' : undefined}
                >
                  {exporting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Download size={18} strokeWidth={2.5} />
                  )}
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ExportDialog;
