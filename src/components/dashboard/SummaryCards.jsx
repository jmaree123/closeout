/**
 * SummaryCards — 5 KPI cards in a responsive row.
 * 1. Total Items (with breakdown)
 * 2. Open Items
 * 3. Overdue Items
 * 4. Closed This Month
 * 5. Avg Days to Close
 */

import { AlertTriangle, CheckCircle2, Clock, CircleDot, FolderOpen } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateItemType } from '../../utils/displayLabels.js';

function KpiCard({ icon: Icon, label, value, accent, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={16} className="text-gray-400" />}
        <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-500">
          {label}
        </span>
      </div>
      <div className={`text-[28px] font-bold tracking-tight ${accent || 'text-boronia-navy'}`}>
        {value}
      </div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

export default function SummaryCards() {
  const items = useItemStore((s) => s.items);
  const getOpenCount = useItemStore((s) => s.getOpenCount);
  const getOverdueCount = useItemStore((s) => s.getOverdueCount);
  const getClosedThisMonthCount = useItemStore((s) => s.getClosedThisMonthCount);
  const getAverageDaysToClose = useItemStore((s) => s.getAverageDaysToClose);
  const { t, lang } = useTranslation();

  const totalItems = items.length;
  const openCount = getOpenCount();
  const overdueCount = getOverdueCount();
  const closedThisMonth = getClosedThisMonthCount();
  const avgDays = getAverageDaysToClose();

  // Breakdown by type
  const actionCount = items.filter((i) => i.itemType === 'Project Action').length;
  const punchCount = items.filter((i) => i.itemType === 'Punch Item').length;
  const auditCount = items.filter((i) => i.itemType === 'Audit Finding').length;

  // Closed last month for trend comparison
  const now = new Date();
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const closedLastMonth = items.filter((i) => {
    if (i.status !== 'Closed' || !i.closeOutDate) return false;
    const d = new Date(i.closeOutDate);
    return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
  }).length;

  const trendUp = closedThisMonth >= closedLastMonth;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Items */}
      <KpiCard icon={CircleDot} label={t('dashboard_total_items')} value={totalItems}>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
            {actionCount} {translateItemType('Project Action', lang)}
          </span>
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
            {punchCount} {translateItemType('Punch Item', lang)}
          </span>
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
            {auditCount} {translateItemType('Audit Finding', lang)}
          </span>
        </div>
      </KpiCard>

      {/* Open Items */}
      <KpiCard
        icon={FolderOpen}
        label={t('dashboard_open_items')}
        value={openCount}
        accent={openCount > 0 ? 'text-status-open' : 'text-boronia-navy'}
      />

      {/* Overdue Items */}
      <KpiCard
        icon={AlertTriangle}
        label={t('dashboard_overdue_items')}
        value={overdueCount}
        accent={overdueCount > 0 ? 'text-red-600' : 'text-boronia-navy'}
      />

      {/* Closed This Month */}
      <KpiCard icon={CheckCircle2} label={t('dashboard_closed_this_month')} value={closedThisMonth}>
        <div className="flex items-center gap-1 mt-0.5">
          {trendUp ? (
            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4.5-4.5L16 17M7 7l4.5 4.5L16 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-4.5 4.5L8 7m0 10l4.5-4.5L17 17" />
            </svg>
          )}
          <span className={`text-xs ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
            vs {closedLastMonth} last month
          </span>
        </div>
      </KpiCard>

      {/* Avg Days to Close */}
      <KpiCard icon={Clock} label={t('dashboard_avg_days_to_close')} value={avgDays || '--'} />
    </div>
  );
}
