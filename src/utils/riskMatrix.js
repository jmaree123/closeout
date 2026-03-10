/**
 * Risk Matrix Logic for CloseOut
 * 5x5 risk matrix mapping likelihood x consequence to risk level
 */

export const LIKELIHOOD_OPTIONS = [
  'Almost Certain',
  'Likely',
  'Possible',
  'Unlikely',
  'Rare',
];

export const CONSEQUENCE_OPTIONS = [
  'Negligible',
  'Minor',
  'Moderate',
  'Major',
  'Catastrophic',
];

export const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export const EFFORT_OPTIONS = ['Low', 'Medium', 'High'];

export const STATUS_OPTIONS = [
  'Open',
  'In Progress',
  'Pending Approval',
  'Pending Verification',
  'Closed',
  'Cancelled',
];

export const ITEM_TYPES = ['Project Action', 'Punch Item', 'Audit Finding'];

export const APPROVAL_OPTIONS = [
  'Not Required',
  'Pending Approval',
  'Approved',
  'Rejected',
];

export const PRIORITY_OPTIONS = ['Do First', 'Plan Carefully', 'Do When Able', 'Reconsider'];

export const PRIORITY_COLORS = {
  'Do First': '#DC2626',
  'Plan Carefully': '#F97316',
  'Do When Able': '#3B82F6',
  'Reconsider': '#9CA3AF',
};

/**
 * Calculate priority quadrant from effort estimate and risk level.
 * Maps to the scatter plot quadrants:
 *   Low effort + High/Critical risk → "Do First"
 *   Medium/High effort + High/Critical risk → "Plan Carefully"
 *   Low effort + Low/Medium risk → "Do When Able"
 *   Medium/High effort + Low/Medium risk → "Reconsider"
 * @param {string} effortEstimate - 'Low' | 'Medium' | 'High'
 * @param {string} riskLevel - 'Low' | 'Medium' | 'High' | 'Critical'
 * @returns {string|null} Priority quadrant label or null if inputs are invalid
 */
export function calculatePriority(effortEstimate, riskLevel) {
  if (!effortEstimate || !riskLevel) return null;

  const highRisk = riskLevel === 'High' || riskLevel === 'Critical';
  const lowEffort = effortEstimate === 'Low';

  if (lowEffort && highRisk) return 'Do First';
  if (!lowEffort && highRisk) return 'Plan Carefully';
  if (lowEffort && !highRisk) return 'Do When Able';
  return 'Reconsider';
}

// 5x5 Risk Matrix: RISK_MATRIX[likelihood][consequence] = riskLevel
export const RISK_MATRIX = {
  'Almost Certain': {
    Catastrophic: 'Critical',
    Major: 'Critical',
    Moderate: 'High',
    Minor: 'High',
    Negligible: 'Medium',
  },
  Likely: {
    Catastrophic: 'Critical',
    Major: 'High',
    Moderate: 'High',
    Minor: 'Medium',
    Negligible: 'Low',
  },
  Possible: {
    Catastrophic: 'High',
    Major: 'High',
    Moderate: 'Medium',
    Minor: 'Low',
    Negligible: 'Low',
  },
  Unlikely: {
    Catastrophic: 'High',
    Major: 'Medium',
    Moderate: 'Low',
    Minor: 'Low',
    Negligible: 'Low',
  },
  Rare: {
    Catastrophic: 'Medium',
    Major: 'Low',
    Moderate: 'Low',
    Minor: 'Low',
    Negligible: 'Low',
  },
};

// Color maps
export const RISK_COLORS = {
  Critical: '#DC2626',
  High: '#F97316',
  Medium: '#EAB308',
  Low: '#22C55E',
};

export const STATUS_COLORS = {
  Open: '#3B82F6',
  'In Progress': '#F59E0B',
  'Pending Approval': '#EC4899',
  'Pending Verification': '#8B5CF6',
  Closed: '#10B981',
  Cancelled: '#9CA3AF',
};

export const TYPE_COLORS = {
  'Project Action': '#3498DB',
  'Punch Item': '#E67E22',
  'Audit Finding': '#E74C3C',
};

export const RISK_MATRIX_CELL_COLORS = {
  Critical: '#C0392B',
  High: '#E67E22',
  Medium: '#F1C40F',
  Low: '#27AE60',
};

/**
 * Calculate risk level from likelihood and consequence using the 5x5 matrix.
 * @param {string} likelihood - One of LIKELIHOOD_OPTIONS
 * @param {string} consequence - One of CONSEQUENCE_OPTIONS
 * @returns {string|null} Risk level string or null if inputs are invalid
 */
export function calculateRiskLevel(likelihood, consequence) {
  if (!likelihood || !consequence) return null;

  const row = RISK_MATRIX[likelihood];
  if (!row) return null;

  const level = row[consequence];
  return level || null;
}
