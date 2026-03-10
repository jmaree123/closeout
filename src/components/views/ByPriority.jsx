/**
 * ByPriority.jsx
 * View page: "Items by Priority" with Chart / Table toggle.
 * Chart view renders ByPriorityChart; Table view renders expandable accordion.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { BarChart3, Table, ChevronDown, ChevronRight } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import useUiStore from '../../store/uiStore.js';
import ByPriorityChart from '../charts/ByPriorityChart.jsx';
import { isOverdue, formatDate, getDaysUntilDue } from '../../utils/dateUtils.js';
import { RISK_COLORS, STATUS_COLORS, PRIORITY_COLORS } from '../../utils/riskMatrix.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateStatus, translateRiskLevel, translatePriority } from '../../utils/displayLabels.js';

const OPEN_STATUSES = new Set(['Open', 'In Progress', 'Pending Approval', 'Pending Verification']);
const PRIORITY_ORDER = ['Do First', 'Plan Carefully', 'Do When Able', 'Reconsider'];

export default function ByPriority() {
  const { items, loadItems } = useItemStore();
  const { openDetailPanel } = useUiStore();
  const { t, lang } = useTranslation();

  const [activeTab, setActiveTab] = useState('chart');
  const [expandedPriority, setExpandedPriority] = useState(null);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const nonArchivedItems = useMemo(() => items.filter((i) => !i.isArchived), [items]);

  // Group all items by priority for the table
  const grouped = useMemo(() => {
    const map = {};
    for (const item of nonArchivedItems) {
      const priority = item.priority || 'Unassigned';
      if (!map[priority]) {
        map[priority] = { name: priority, items: [], openCount: 0, overdueCount: 0, nextDue: null };
      }
      map[priority].items.push(item);
      if (OPEN_STATUSES.has(item.status)) {
        map[priority].openCount += 1;
        if (isOverdue(item.dueDate, item.status)) {
          map[priority].overdueCount += 1;
        }
      }
      if (item.dueDate && OPEN_STATUSES.has(item.status)) {
        const daysUntil = getDaysUntilDue(item.dueDate);
        if (daysUntil !== null) {
          if (map[priority].nextDue === null || item.dueDate < map[priority].nextDue) {
            map[priority].nextDue = item.dueDate;
          }
        }
      }
    }
    // Sort: known priorities in order first, then unassigned at the end
    const result = [];
    for (const p of PRIORITY_ORDER) {
      if (map[p]) result.push(map[p]);
    }
    if (map['Unassigned']) result.push(map['Unassigned']);
    return result;
  }, [nonArchivedItems]);

  const toggleExpand = useCallback(
    (name) => {
      setExpandedPriority((prev) => (prev === name ? null : name));
    },
    []
  );

  const displayName = (name) => (name === 'Unassigned' ? t('view_unassigned') : translatePriority(name, lang));

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-boronia-navy">{t('view_by_priority')}</h1>

        {/* Tab toggle */}
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

      {/* Content */}
      {activeTab === 'chart' ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ByPriorityChart items={nonArchivedItems} />
        </div>
      ) : (
        <div className="space-y-1">
          {grouped.map((group) => (
            <div key={group.name} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Priority header row */}
              <button
                onClick={() => toggleExpand(group.name)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedPriority === group.name ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PRIORITY_COLORS[group.name] || '#9CA3AF' }}
                  />
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

              {/* Expanded items */}
              {expandedPriority === group.name && (
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
