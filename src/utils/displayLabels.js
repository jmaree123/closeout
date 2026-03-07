import { translations } from '../i18n/translations.js';

function getStrings(lang) {
  return translations[lang] || translations.en;
}

export function translateStatus(value, lang = 'en') {
  const s = getStrings(lang);
  const map = {
    'Open': s.status_open,
    'In Progress': s.status_in_progress,
    'Pending Verification': s.status_pending_verification,
    'Closed': s.status_closed,
    'Cancelled': s.status_cancelled,
    'Overdue': s.status_overdue,
  };
  return map[value] ?? value;
}

export function translateRiskLevel(value, lang = 'en') {
  const s = getStrings(lang);
  const map = {
    'Critical': s.risk_critical,
    'High': s.risk_high,
    'Medium': s.risk_medium,
    'Low': s.risk_low,
  };
  return map[value] ?? value;
}

export function translateLikelihood(value, lang = 'en') {
  const s = getStrings(lang);
  const map = {
    'Almost Certain': s.likelihood_almost_certain,
    'Likely': s.likelihood_likely,
    'Possible': s.likelihood_possible,
    'Unlikely': s.likelihood_unlikely,
    'Rare': s.likelihood_rare,
  };
  return map[value] ?? value;
}

export function translateConsequence(value, lang = 'en') {
  const s = getStrings(lang);
  const map = {
    'Catastrophic': s.consequence_catastrophic,
    'Major': s.consequence_major,
    'Moderate': s.consequence_moderate,
    'Minor': s.consequence_minor,
    'Negligible': s.consequence_negligible,
  };
  return map[value] ?? value;
}

export function translateEffort(value, lang = 'en') {
  const s = getStrings(lang);
  const map = {
    'High': s.effort_high,
    'Medium': s.effort_medium,
    'Low': s.effort_low,
  };
  return map[value] ?? value;
}

export function translateItemType(value, lang = 'en') {
  const s = getStrings(lang);
  const map = {
    'Project Action': s.type_project_action,
    'Punch Item': s.type_punch_item,
    'Audit Finding': s.type_audit_finding,
  };
  return map[value] ?? value;
}

export function translateApprovalStatus(value, lang = 'en') {
  const s = getStrings(lang);
  const map = {
    'Not Required': s.approval_not_required,
    'Pending Approval': s.approval_pending,
    'Approved': s.approval_approved,
    'Rejected': s.approval_rejected,
  };
  return map[value] ?? value;
}
