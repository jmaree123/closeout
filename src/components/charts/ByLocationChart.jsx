/**
 * ByLocationChart.jsx
 * Recharts PieChart (donut variant) showing open item count per location.
 * Below the chart: ranked list table with Rank, Location, Open, Overdue, % of Total.
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { isOverdue } from '../../utils/dateUtils.js';
import { useTranslation } from '../../hooks/useTranslation.js';

const CHART_COLORS = [
  '#E74C3C', '#9B59B6', '#3498DB', '#2ECC71', '#E67E22',
  '#1ABC9C', '#F39C12', '#34495E', '#E91E63', '#00BCD4',
  '#8BC34A', '#FF5722', '#607D8B', '#795548', '#CDDC39',
];

const OPEN_STATUSES = new Set(['Open', 'In Progress', 'Pending Verification']);

export default function ByLocationChart({ items = [] }) {
  const { t } = useTranslation();

  const data = useMemo(() => {
    const grouped = {};
    for (const item of items) {
      if (!item.isArchived && OPEN_STATUSES.has(item.status)) {
        const loc = item.location || 'Unspecified';
        if (!grouped[loc]) grouped[loc] = { name: loc, open: 0, overdue: 0 };
        grouped[loc].open += 1;
        if (isOverdue(item.dueDate, item.status)) {
          grouped[loc].overdue += 1;
        }
      }
    }
    return Object.values(grouped).sort((a, b) => b.open - a.open);
  }, [items]);

  const totalOpen = useMemo(() => data.reduce((sum, d) => sum + d.open, 0), [data]);

  const chartData = useMemo(
    () => data.map((d) => ({ name: d.name === 'Unspecified' ? t('view_unspecified') : d.name, value: d.open })),
    [data, t]
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
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
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
          <span className="text-[28px] font-bold tracking-tight text-boronia-navy">{totalOpen}</span>
          <span className="text-xs text-gray-500 font-medium">{t('dashboard_open_items')}</span>
        </div>
      </div>

      {/* Ranked table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('field_location')}</th>
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
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    {idx + 1}
                  </div>
                </td>
                <td className="py-2 px-2 font-medium text-boronia-navy">
                  {d.name === 'Unspecified' ? t('view_unspecified') : d.name}
                </td>
                <td className="py-2 px-2 text-right font-medium">{d.open}</td>
                <td className={`py-2 px-2 text-right font-medium ${d.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {d.overdue}
                </td>
                <td className="py-2 px-2 text-right text-gray-500">
                  {totalOpen > 0 ? ((d.open / totalOpen) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
