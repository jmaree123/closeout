/**
 * StatusDonut — Recharts PieChart (donut variant) showing item distribution by status.
 * 5 slices: Open, In Progress, Pending Verification, Closed, Cancelled.
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import useItemStore from '../../store/itemStore.js';
import { STATUS_COLORS, STATUS_OPTIONS } from '../../utils/riskMatrix.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateStatus } from '../../utils/displayLabels.js';

export default function StatusDonut() {
  const items = useItemStore((s) => s.items);
  const { t, lang } = useTranslation();

  const { data, total } = useMemo(() => {
    const counts = {};
    for (const status of STATUS_OPTIONS) {
      counts[status] = 0;
    }
    for (const item of items) {
      if (counts[item.status] !== undefined) {
        counts[item.status] += 1;
      }
    }
    const d = STATUS_OPTIONS.map((status) => ({
      name: status,
      displayName: translateStatus(status, lang),
      value: counts[status],
      color: STATUS_COLORS[status] || '#9CA3AF',
    }));
    return { data: d, total: items.length };
  }, [items, lang]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <h3 className="text-base font-semibold text-boronia-navy mb-4">{t('dashboard_by_status')}</h3>

      {total === 0 ? (
        <div className="flex items-center justify-center h-56 text-sm text-gray-400">
          No items yet
        </div>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [`${value} items`, props.payload.displayName]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-boronia-navy">{total}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">{t('view_total')}</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 space-y-1.5">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-600">{entry.displayName}</span>
                </div>
                <span className="font-medium text-gray-800">{entry.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
