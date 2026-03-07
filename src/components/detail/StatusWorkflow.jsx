/**
 * StatusWorkflow — shows allowed next status transitions as action buttons.
 * Follows the defined transition rules from the design brief.
 *
 * Props:
 *   currentStatus: string — current item status
 *   onStatusChange: (newStatus) => void — called when a transition button is clicked
 */

import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateStatus } from '../../utils/displayLabels.js';

const TRANSITIONS = {
  Open: [
    { labelKey: 'workflow_move_in_progress', target: 'In Progress', variant: 'primary' },
    { labelKey: 'workflow_close_no_action', target: 'Closed', variant: 'secondary' },
    { labelKey: 'workflow_cancel', target: 'Cancelled', variant: 'destructive' },
  ],
  'In Progress': [
    { labelKey: 'workflow_submit_verification', target: 'Pending Verification', variant: 'primary' },
    { labelKey: 'workflow_return_open', target: 'Open', variant: 'secondary' },
    { labelKey: 'workflow_cancel', target: 'Cancelled', variant: 'destructive' },
  ],
  'Pending Verification': [
    { labelKey: 'workflow_mark_verified_close', target: 'Closed', variant: 'primary' },
    { labelKey: 'workflow_reject_back', target: 'In Progress', variant: 'secondary' },
  ],
  Closed: [
    { labelKey: 'workflow_reopen', target: 'Open', variant: 'secondary' },
  ],
  Cancelled: [
    { labelKey: 'workflow_reopen', target: 'Open', variant: 'secondary' },
  ],
};

const VARIANT_CLASSES = {
  primary: 'bg-boronia-coral hover:bg-boronia-coral-light text-white',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  destructive: 'bg-white border border-red-300 text-red-600 hover:bg-red-50',
};

export default function StatusWorkflow({ currentStatus, onStatusChange }) {
  const [loading, setLoading] = useState(null);
  const { t, lang } = useTranslation();

  const transitions = TRANSITIONS[currentStatus] || [];

  if (transitions.length === 0) return null;

  const handleClick = async (target) => {
    setLoading(target);
    try {
      await onStatusChange(target);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-2">
        {t('panel_current_status')}: <span className="font-medium text-gray-700">{translateStatus(currentStatus, lang)}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {transitions.map((tr) => (
          <button
            key={tr.target}
            type="button"
            disabled={loading !== null}
            onClick={() => handleClick(tr.target)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${VARIANT_CLASSES[tr.variant]} disabled:opacity-60`}
          >
            {loading === tr.target ? t('panel_updating') : t(tr.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
