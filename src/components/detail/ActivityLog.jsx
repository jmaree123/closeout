/**
 * ActivityLog — vertical timeline feed of item changes.
 * Fetches from database.js getActivityLog(itemId) and displays newest first.
 *
 * Props:
 *   itemId: string — the user-facing item ID (e.g. "ACT-001")
 */

import { useState, useEffect } from 'react';
import { getActivityLog } from '../../db/database.js';
import { getRelativeTime } from '../../utils/dateUtils.js';
import { useTranslation } from '../../hooks/useTranslation.js';

export default function ActivityLog({ itemId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const { t, lang } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    async function fetchLog() {
      if (!itemId) {
        setEntries([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const log = await getActivityLog(itemId);
        if (!cancelled) {
          setEntries(log);
        }
      } catch (err) {
        console.error('Failed to fetch activity log:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLog();
    return () => { cancelled = true; };
  }, [itemId]);

  if (loading) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs text-gray-400">{t('loading_activity')}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs text-gray-400">{t('no_activity_recorded')}</p>
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      <div className="relative pl-5">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-gray-200" />

        {entries.map((entry, idx) => (
          <div key={entry.id || idx} className="relative pb-3 last:pb-0">
            {/* Dot */}
            <div
              className="absolute left-[-13px] top-1 w-3 h-3 rounded-full border-2 border-gray-300 bg-white"
            />

            {/* Content */}
            <div className="ml-2">
              <p className="text-xs text-gray-800 leading-relaxed">
                {entry.action || 'Unknown action'}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {getRelativeTime(entry.timestamp, lang)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
