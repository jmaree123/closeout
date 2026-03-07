/**
 * TrendChart — Recharts LineChart showing Items Opened vs Closed over time.
 * Supports weekly / monthly grouping and 30 / 90 / 180 day time windows.
 */

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import useItemStore from '../../store/itemStore.js';
import { useTranslation } from '../../hooks/useTranslation.js';

const TIME_WINDOWS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '180d', days: 180 },
];

const GROUP_MODES = ['weekly', 'monthly'];

function getWeekKey(date) {
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekLabel(key) {
  // "2026-W10" => "W10"
  const parts = key.split('-');
  return parts[1] || key;
}

function getMonthLabel(key) {
  // "2026-03" => "Mar 26"
  const [year, month] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

export default function TrendChart() {
  const items = useItemStore((s) => s.items);
  const [window, setWindow] = useState(90);
  const [groupMode, setGroupMode] = useState('weekly');
  const { t } = useTranslation();

  const data = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - window);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const getKey = groupMode === 'weekly' ? getWeekKey : getMonthKey;
    const getLabel = groupMode === 'weekly' ? getWeekLabel : getMonthLabel;

    const buckets = {};

    // Count opened items (by raisedDate)
    for (const item of items) {
      const dateStr = item.raisedDate || item.createdAt?.split('T')[0];
      if (!dateStr || dateStr < cutoffStr) continue;
      const key = getKey(dateStr);
      if (!buckets[key]) buckets[key] = { key, opened: 0, closed: 0 };
      buckets[key].opened += 1;
    }

    // Count closed items (by closeOutDate)
    for (const item of items) {
      if (item.status !== 'Closed' || !item.closeOutDate) continue;
      if (item.closeOutDate < cutoffStr) continue;
      const key = getKey(item.closeOutDate);
      if (!buckets[key]) buckets[key] = { key, opened: 0, closed: 0 };
      buckets[key].closed += 1;
    }

    return Object.keys(buckets)
      .sort()
      .map((key) => ({
        ...buckets[key],
        label: getLabel(key),
      }));
  }, [items, window, groupMode]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-boronia-navy">{t('dashboard_trend_title')}</h3>
        <div className="flex items-center gap-3">
          {/* Group mode toggle */}
          <div className="flex bg-gray-100 rounded-md p-0.5">
            {GROUP_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  groupMode === mode
                    ? 'bg-white text-boronia-navy shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode === 'weekly' ? t('dashboard_weekly') : t('dashboard_monthly')}
              </button>
            ))}
          </div>
          {/* Time window pills */}
          <div className="flex bg-gray-100 rounded-md p-0.5">
            {TIME_WINDOWS.map((tw) => (
              <button
                key={tw.days}
                onClick={() => setWindow(tw.days)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  window === tw.days
                    ? 'bg-white text-boronia-navy shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tw.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-56 text-sm text-gray-400">
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="opened"
              name={t('dashboard_items_opened')}
              stroke="#F06B6B"
              strokeWidth={2}
              dot={{ r: 3, fill: '#F06B6B' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="closed"
              name={t('dashboard_items_closed')}
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10B981' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
