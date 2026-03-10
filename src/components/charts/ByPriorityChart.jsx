/**
 * ByPriorityChart.jsx
 * Recharts PieChart (donut variant) showing item count per priority quadrant.
 * Below the chart: ranked list table with Rank, Priority, Count, Overdue, % of Total.
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PRIORITY_COLORS } from '../../utils/riskMatrix.js';
import { isOverdue } from '../../utils/dateUtils.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translatePriority } from '../../utils/displayLabels.js';

const PRIORITY_ORDER = ['Do First', 'Plan Carefully', 'Do When Able', 'Reconsider'];

const OPEN_STATUSES = new Set(['Open', 'In Progress', 'Pending Approval', 'Pending Verification']);

export default function ByPriorityChart({ items = [] }) {
  const { t, lang } = useTranslation();

  const data = useMemo(() => {
    const grouped = {};
    for (const p of PRIORITY_ORDER) {
      grouped[p] = { name: p, count: 0, overdue: 0 };
    }
    for (const item of items) {
      if (!item.isArchived && item.priority && OPEN_STATUSES.has(item.status)) {
        if (grouped[item.priority]) {
          grouped[item.priority].count += 1;
          if (isOverdue(item.dueDate, item.status)) {
            grouped[item.priority].overdue += 1;
          }
        }
      }
    }
    return PRIORITY_ORDER.map((p) => grouped[p]).filter((d) => d.count > 0);
  }, [items]);

  const totalCount = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);

  const chartData = useMemo(
    () => data.map((d) => ({ name: translatePriority(d.name, lang), value: d.count, key: d.name })),
    [data, lang]
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        {t('view_no_items')}
      </div>
    );
  }

  return (
    <div>
      {/* Donut chart */}
      <div className="relative" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              dataKey="value"
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={PRIORITY_COLORS[entry.key] || '#9CA3AF'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} ${t('register_items')}`, name]}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[28px] font-bold tracking-tight text-boronia-navy">{totalCount}</span>
          <span className="text-xs text-gray-500 font-medium">{t('dashboard_open_items')}</span>
        </div>
      </div>

      {/* Ranked table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('field_priority')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('view_open')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('view_overdue')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">% {t('view_total')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, idx) => (
              <tr key={d.name} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-2 text-gray-500">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: PRIORITY_COLORS[d.name] || '#9CA3AF' }}
                    />
                    {idx + 1}
                  </div>
                </td>
                <td className="py-2 px-2 font-medium text-boronia-navy">
                  {translatePriority(d.name, lang)}
                </td>
                <td className="py-2 px-2 text-right font-medium">{d.count}</td>
                <td className={`py-2 px-2 text-right font-medium ${d.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {d.overdue}
                </td>
                <td className="py-2 px-2 text-right text-gray-500">
                  {totalCount > 0 ? ((d.count / totalCount) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
