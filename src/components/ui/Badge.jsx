/**
 * Badge — reusable pill/chip component for status, risk, type, and priority.
 * Usage:
 *   <Badge variant="status" value="Open" />
 *   <Badge variant="risk" value="Critical" />
 *   <Badge variant="type" value="Project Action" />
 *   <Badge variant="priority" value="P1" />
 */

import { STATUS_COLORS, RISK_COLORS, TYPE_COLORS } from '../../utils/riskMatrix.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateStatus, translateRiskLevel, translateItemType } from '../../utils/displayLabels.js';

const PRIORITY_COLORS = {
  P1: '#DC2626',
  P2: '#F97316',
  P3: '#3B82F6',
};

function getColor(variant, value) {
  switch (variant) {
    case 'status':
      return STATUS_COLORS[value] || '#9CA3AF';
    case 'risk':
      return RISK_COLORS[value] || '#9CA3AF';
    case 'type':
      return TYPE_COLORS[value] || '#9CA3AF';
    case 'priority':
      return PRIORITY_COLORS[value] || '#9CA3AF';
    default:
      return '#9CA3AF';
  }
}

function getDisplayLabel(variant, value, lang) {
  switch (variant) {
    case 'status':
      return translateStatus(value, lang);
    case 'risk':
      return translateRiskLevel(value, lang);
    case 'type':
      return translateItemType(value, lang);
    default:
      return value;
  }
}

export default function Badge({ variant = 'status', value, className = '' }) {
  const { lang } = useTranslation();

  if (!value) return null;

  const color = getColor(variant, value);
  const displayLabel = getDisplayLabel(variant, value, lang);

  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${className}`}
      style={{
        backgroundColor: `${color}1A`,
        color: color,
      }}
    >
      {variant === 'status' && (
        <span
          className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {displayLabel}
    </span>
  );
}
