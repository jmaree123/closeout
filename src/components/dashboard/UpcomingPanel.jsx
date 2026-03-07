/**
 * UpcomingPanel — items due in the next 7 days, grouped by day.
 * Left border colour-coded by risk level.
 */

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { format, startOfDay, addDays, isSameDay } from 'date-fns';
import useItemStore from '../../store/itemStore.js';
import useUiStore from '../../store/uiStore.js';
import { getDaysUntilDue } from '../../utils/dateUtils.js';
import { RISK_COLORS } from '../../utils/riskMatrix.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import Badge from '../ui/Badge.jsx';

function getDayLabel(date, t) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  if (isSameDay(date, today)) return t('dashboard_due_today');
  if (isSameDay(date, tomorrow)) return t('dashboard_due_tomorrow');
  return format(date, 'EEEE, MMM d');
}

export default function UpcomingPanel() {
  const items = useItemStore((s) => s.items);
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);
  const { t } = useTranslation();

  const groupedByDay = useMemo(() => {
    const today = startOfDay(new Date());
    const endDate = addDays(today, 7);
    const groups = {};

    for (const item of items) {
      if (!item.dueDate) continue;
      if (item.status === 'Closed' || item.status === 'Cancelled') continue;

      const due = startOfDay(new Date(item.dueDate));
      if (due < today || due >= endDate) continue;

      const dayKey = format(due, 'yyyy-MM-dd');
      if (!groups[dayKey]) {
        groups[dayKey] = { date: due, label: getDayLabel(due, t), items: [] };
      }
      groups[dayKey].items.push(item);
    }

    return Object.keys(groups)
      .sort()
      .map((key) => groups[key]);
  }, [items, t]);

  const totalCount = groupedByDay.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-gray-400" />
        <h3 className="text-base font-semibold text-boronia-navy">{t('dashboard_upcoming_panel_title')}</h3>
        {totalCount > 0 && (
          <span className="text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
            {totalCount}
          </span>
        )}
      </div>

      {/* Content */}
      {groupedByDay.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-gray-500">{t('dashboard_no_upcoming')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map((group) => (
            <div key={group.label}>
              <h4 className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mb-1.5">
                {group.label}
              </h4>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const borderColor = RISK_COLORS[item.riskLevel] || '#9CA3AF';
                  return (
                    <button
                      key={item.id}
                      onClick={() => openDetailPanel(item.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors text-left group border-l-[3px]"
                      style={{ borderLeftColor: borderColor }}
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
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
