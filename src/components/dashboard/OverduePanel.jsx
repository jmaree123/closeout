/**
 * OverduePanel — shows top 10 overdue items sorted by days overdue (descending).
 */

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import useUiStore from '../../store/uiStore.js';
import { getDaysOverdue } from '../../utils/dateUtils.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import Badge from '../ui/Badge.jsx';

export default function OverduePanel() {
  const getOverdueItems = useItemStore((s) => s.getOverdueItems);
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);
  const { t } = useTranslation();

  const overdueItems = getOverdueItems();

  // Sort by days overdue descending, take top 10
  const sorted = [...overdueItems]
    .map((item) => ({
      ...item,
      daysOverdue: getDaysOverdue(item.dueDate, item.status) || 0,
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-red-500" />
        <h3 className="text-base font-semibold text-boronia-navy">{t('dashboard_overdue_panel_title')}</h3>
        {overdueItems.length > 0 && (
          <span className="text-xs font-medium bg-red-100 text-red-700 rounded-full px-2 py-0.5">
            {overdueItems.length}
          </span>
        )}
      </div>

      {/* Content */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 size={32} className="text-green-500 mb-2" />
          <p className="text-sm text-gray-500">{t('dashboard_no_overdue')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((item) => (
            <button
              key={item.id}
              onClick={() => openDetailPanel(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors text-left group"
            >
              {/* Item ID badge */}
              <Badge variant="type" value={item.itemId} className="flex-shrink-0" />

              {/* Title */}
              <span className="text-sm text-gray-700 truncate flex-1 min-w-0 group-hover:text-boronia-navy">
                {item.title?.length > 40
                  ? item.title.slice(0, 40) + '...'
                  : item.title || 'Untitled'}
              </span>

              {/* Assigned To */}
              <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
                {item.assignedTo || '--'}
              </span>

              {/* Risk badge */}
              <Badge variant="risk" value={item.riskLevel} className="flex-shrink-0" />

              {/* Days overdue pill */}
              <span className="text-xs font-medium text-red-600 bg-red-50 rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                {item.daysOverdue}d
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
