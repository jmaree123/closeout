/**
 * ByLocation.jsx
 * View page: "Items by Location" with Chart / Table toggle.
 * Chart view renders ByLocationChart; Table view renders expandable accordion.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { BarChart3, Table, ChevronDown, ChevronRight } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import useUiStore from '../../store/uiStore.js';
import ByLocationChart from '../charts/ByLocationChart.jsx';
import { isOverdue, formatDate, getDaysUntilDue } from '../../utils/dateUtils.js';
import { RISK_COLORS, STATUS_COLORS } from '../../utils/riskMatrix.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateStatus, translateRiskLevel } from '../../utils/displayLabels.js';

const OPEN_STATUSES = new Set(['Open', 'In Progress', 'Pending Approval', 'Pending Verification']);

export default function ByLocation() {
  const { items, loadItems } = useItemStore();
  const { openDetailPanel } = useUiStore();
  const { t, lang } = useTranslation();

  const [activeTab, setActiveTab] = useState('chart');
  const [expandedLoc, setExpandedLoc] = useState(null);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const nonArchivedItems = useMemo(() => items.filter((i) => !i.isArchived), [items]);

  const grouped = useMemo(() => {
    const map = {};
    for (const item of nonArchivedItems) {
      const loc = item.location || 'Unspecified';
      if (!map[loc]) {
        map[loc] = { name: loc, items: [], openCount: 0, overdueCount: 0, nextDue: null };
      }
      map[loc].items.push(item);
      if (OPEN_STATUSES.has(item.status)) {
        map[loc].openCount += 1;
        if (isOverdue(item.dueDate, item.status)) {
          map[loc].overdueCount += 1;
        }
      }
      if (item.dueDate && OPEN_STATUSES.has(item.status)) {
        const daysUntil = getDaysUntilDue(item.dueDate);
        if (daysUntil !== null) {
          if (map[loc].nextDue === null || item.dueDate < map[loc].nextDue) {
            map[loc].nextDue = item.dueDate;
          }
        }
      }
    }
    return Object.values(map).sort((a, b) => b.openCount - a.openCount);
  }, [nonArchivedItems]);

  const toggleExpand = useCallback(
    (name) => {
      setExpandedLoc((prev) => (prev === name ? null : name));
    },
    []
  );

  // Display name: translate "Unspecified" if needed
  const displayName = (name) => (name === 'Unspecified' ? t('view_unspecified') : name);

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-boronia-navy">{t('view_by_location')}</h1>

        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'chart'
                ? 'bg-boronia-navy text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={16} />
            {t('view_chart')}
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'table'
                ? 'bg-boronia-navy text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Table size={16} />
            {t('view_table')}
          </button>
        </div>
      </div>

      {activeTab === 'chart' ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ByLocationChart items={nonArchivedItems} />
        </div>
      ) : (
        <div className="space-y-1">
          {grouped.map((group) => (
            <div key={group.name} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleExpand(group.name)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedLoc === group.name ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                  <span className="font-medium text-boronia-navy">{displayName(group.name)}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">{t('view_open')}: </span>
                    <span className="font-medium">{group.openCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('view_overdue')}: </span>
                    <span className={`font-medium ${group.overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {group.overdueCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('field_due_date')}: </span>
                    <span className="font-medium text-gray-700">
                      {group.nextDue ? formatDate(group.nextDue) : '--'}
                    </span>
                  </div>
                </div>
              </button>

              {expandedLoc === group.name && (
                <div className="border-t border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('field_item_id')}</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('field_title')}</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('field_status')}</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('field_risk')}</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('field_due_date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => {
                        const itemIsOverdue = isOverdue(item.dueDate, item.status);
                        return (
                          <tr
                            key={item.id || item.itemId}
                            onClick={() => openDetailPanel(item.id)}
                            className={`border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors ${
                              itemIsOverdue ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="py-2 px-4 font-medium text-gray-600">{item.itemId}</td>
                            <td className="py-2 px-4 font-medium text-boronia-navy max-w-xs truncate">{item.title}</td>
                            <td className="py-2 px-4">
                              <span
                                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${STATUS_COLORS[item.status] || '#9CA3AF'}15`,
                                  color: STATUS_COLORS[item.status] || '#9CA3AF',
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: STATUS_COLORS[item.status] || '#9CA3AF' }}
                                />
                                {translateStatus(item.status, lang)}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              {item.riskLevel && (
                                <span
                                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${RISK_COLORS[item.riskLevel] || '#22C55E'}15`,
                                    color: RISK_COLORS[item.riskLevel] || '#22C55E',
                                  }}
                                >
                                  {translateRiskLevel(item.riskLevel, lang)}
                                </span>
                              )}
                            </td>
                            <td className={`py-2 px-4 text-xs ${itemIsOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              {formatDate(item.dueDate) || '--'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {grouped.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">{t('view_no_items')}</div>
          )}
        </div>
      )}
    </div>
  );
}
