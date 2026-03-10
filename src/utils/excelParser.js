/**
 * Excel Parser for CloseOut
 * Uses SheetJS (xlsx) for importing Excel files.
 * Supports both the official template format and fuzzy column matching for
 * arbitrary spreadsheets.
 */

import * as XLSX from 'xlsx';
import { parseDate } from './dateUtils.js';
import { calculateRiskLevel, STATUS_OPTIONS, LIKELIHOOD_OPTIONS, CONSEQUENCE_OPTIONS, EFFORT_OPTIONS, APPROVAL_OPTIONS } from './riskMatrix.js';

// ---------------------------------------------------------------------------
// Template Header Mapping (exact match, case-insensitive)
// ---------------------------------------------------------------------------

const TEMPLATE_HEADER_MAP = {
  'item id': 'itemId',
  'title': 'title',
  'description': 'description',
  'department': 'department',
  'location': 'location',
  'consequence': 'consequence',
  'likelihood': 'likelihood',
  'risk level': 'riskLevel',
  'effort estimate': 'effortEstimate',
  'effort hours': 'effortHours',
  'due date': 'dueDate',
  'assigned to': 'assignedTo',
  'status': 'status',
  'corrective action': 'correctiveAction',
  'verification person': 'verificationPerson',
  'verification date': 'verificationDate',
  'approval status': 'approvalStatus',
  'approver': 'approver',
  'findings': 'title',
  'recommendations': 'description',
  'accountable person': 'assignedTo',
  'date completed': 'closeOutDate',
  'verified by who': 'verificationPerson',
  'date verified': 'verificationDate',
  'source': 'source',
  'date': 'raisedDate',
  'feasibility analysis for implementation': 'effortEstimate',
  'feasibility': 'effortEstimate',
  'verified as completed?': 'verifiedAsCompleted',
  'verified as completed': 'verifiedAsCompleted',
};

// ---------------------------------------------------------------------------
// Fuzzy Column Aliases
// ---------------------------------------------------------------------------

const COLUMN_ALIASES = {
  title: ['title', 'action', 'finding', 'findings', 'item', 'action item', 'subject'],
  riskLevel: ['risk', 'risk level', 'risk rating', 'severity'],
  likelihood: ['likelihood', 'probability', 'freq', 'frequency'],
  consequence: ['consequence', 'impact', 'severity', 'effect'],
  effortEstimate: ['effort', 'effort estimate', 'complexity', 'feasibility analysis for implementation', 'feasibility'],
  dueDate: ['due date', 'target date', 'close-out date', 'deadline', 'target'],
  assignedTo: ['assigned to', 'responsible', 'owner', 'action owner', 'responsible party', 'accountable person'],
  department: ['department', 'dept', 'discipline', 'group', 'team'],
  location: ['location', 'area', 'site', 'module', 'system', 'zone'],
  status: ['status', 'state', 'progress', 'completion'],
  description: ['description', 'recommendations'],
  correctiveAction: ['corrective action', 'action required', 'remediation', 'action description'],
  verificationPerson: ['verified by', 'verification', 'checker', 'reviewer', 'verified by who'],
  verificationDate: ['verification date', 'verified date', 'date verified'],
  closeOutDate: ['close out date', 'closeout date', 'date completed', 'completion date'],
  raisedBy: ['raised by', 'identified by', 'originator', 'reported by'],
  raisedDate: ['raised date', 'date raised', 'open date', 'issue date', 'date identified', 'date'],
  source: ['source', 'meeting', 'audit', 'origin', 'reference'],
  verifiedAsCompleted: ['verified as completed?', 'verified as completed'],
};

// ---------------------------------------------------------------------------
// Value Aliases — map client-specific terms to the app's canonical values
// ---------------------------------------------------------------------------

const STATUS_ALIASES = {
  'completed': 'Closed',
  'complete': 'Closed',
};

const CONSEQUENCE_ALIASES = {
  'critical': 'Catastrophic',
  'high': 'Major',
  'medium': 'Moderate',
  'low': 'Minor',
};

const LIKELIHOOD_ALIASES = {
  'certain': 'Almost Certain',
  'frequent': 'Almost Certain',
};

const EFFORT_ALIASES = {
  'easy': 'Low',
  'hard': 'High',
};

const RISK_LEVEL_ALIASES = {
  'high': 'High',
  'medium': 'Medium',
  'low': 'Low',
  'critical': 'Critical',
};

/**
 * Resolve a raw value against canonical options then alias map.
 * Returns the matched canonical value, alias-mapped value, or the raw value.
 */
function resolveAlias(raw, canonicalOptions, aliasMap) {
  if (!raw) return raw;
  const trimmed = String(raw).trim();
  if (!trimmed) return trimmed;

  // Exact canonical match (case-insensitive)
  const canonical = canonicalOptions.find(
    (o) => o.toLowerCase() === trimmed.toLowerCase()
  );
  if (canonical) return canonical;

  // Alias match (case-insensitive)
  const aliased = aliasMap[trimmed.toLowerCase()];
  if (aliased) return aliased;

  return trimmed;
}

// ---------------------------------------------------------------------------
// Fill-Down Pre-Processing — handles merged cells in Excel
// ---------------------------------------------------------------------------

/**
 * Columns that should NOT be filled down (intentionally blank on some rows).
 */
const FILL_DOWN_SKIP_HEADERS = new Set([
  'title', 'description', 'corrective action', 'recommendations',
  'action', 'finding', 'findings', 'subject', 'action description',
  'action required', 'remediation', 'details', 'notes', 'comments',
  'accountable person', 'assigned to', 'responsible', 'owner', 'action owner',
]);

/**
 * Fill empty cells with the last non-empty value in each column.
 * Skips columns whose header matches FILL_DOWN_SKIP_HEADERS.
 * @param {string[]} headers - The header row
 * @param {any[][]} rows - Data rows (mutated in place)
 */
function fillDownMergedCells(headers, rows) {
  if (rows.length === 0) return;

  const colCount = headers.length;
  const skipCol = headers.map((h) =>
    FILL_DOWN_SKIP_HEADERS.has(String(h ?? '').trim().toLowerCase())
  );

  for (let col = 0; col < colCount; col++) {
    if (skipCol[col]) continue;

    let lastValue = null;
    for (let row = 0; row < rows.length; row++) {
      const cell = rows[row][col];
      if (cell != null && cell !== '' && String(cell).trim() !== '') {
        lastValue = cell;
      } else if (lastValue != null) {
        rows[row][col] = lastValue;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an Excel file (ArrayBuffer or File) and return structured data.
 * @param {File|ArrayBuffer} file - The Excel file to parse
 * @returns {{ headers: string[], rows: any[][], sheetName: string }}
 */
export function parseExcelFile(file) {
  let data;
  if (file instanceof ArrayBuffer) {
    data = file;
  } else if (file.arrayBuffer) {
    // File object — must be handled asynchronously
    throw new Error('Please pass an ArrayBuffer. Use file.arrayBuffer() before calling parseExcelFile.');
  } else {
    data = file;
  }

  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('No sheets found in the workbook');
  }

  // Convert to array of arrays (header: 1 gives raw arrays)
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawData.length === 0) {
    return { headers: [], rows: [], sheetName };
  }

  // Find the header row — first row that has at least 3 non-empty cells
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawData.length, 10); i++) {
    const nonEmpty = rawData[i].filter((cell) => cell !== '' && cell != null).length;
    if (nonEmpty >= 3) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rawData[headerRowIndex].map((h) => String(h ?? '').trim());
  const rows = rawData.slice(headerRowIndex + 1).filter((row) => {
    // Skip completely empty rows
    return row.some((cell) => cell !== '' && cell != null);
  });

  // Fill down merged cells before any mapping or validation
  fillDownMergedCells(headers, rows);

  return { headers, rows, sheetName };
}

/**
 * Auto-map column headers to internal field names.
 * Uses exact template matching first, then fuzzy alias matching.
 * @param {string[]} headers - Array of header strings from the spreadsheet
 * @returns {{ [fieldName: string]: number }} Mapping of field name to column index
 */
export function autoMapColumns(headers) {
  const mapping = {};
  const normalised = headers.map((h) => String(h ?? '').trim().toLowerCase());

  // Pass 1: exact template matches
  for (let i = 0; i < normalised.length; i++) {
    const header = normalised[i];
    if (TEMPLATE_HEADER_MAP[header]) {
      mapping[TEMPLATE_HEADER_MAP[header]] = i;
    }
  }

  // Pass 2: fuzzy alias matches (only for fields not yet mapped)
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (mapping[field] !== undefined) continue;

    for (let i = 0; i < normalised.length; i++) {
      // Skip columns already mapped to a field
      const alreadyUsed = Object.values(mapping).includes(i);
      if (alreadyUsed) continue;

      const header = normalised[i];
      if (aliases.some((alias) => header === alias || header.includes(alias))) {
        mapping[field] = i;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Validate parsed rows against the mapping.
 * Required fields: title, dueDate, assignedTo, department, status
 * @param {any[][]} rows - Raw row arrays
 * @param {{ [field]: number }} mapping - Column mapping
 * @param {string} dateFormat - 'DD/MM/YYYY' or 'MM/DD/YYYY'
 * @returns {{ validRows: any[][], errors: { row: number, message: string }[] }}
 */
export function validateRows(rows, mapping, dateFormat = 'DD/MM/YYYY') {
  const validRows = [];
  const errors = [];
  const requiredFields = ['title'];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1; // 1-indexed for user display
    const rowErrors = [];

    // Check required fields
    for (const field of requiredFields) {
      const colIdx = mapping[field];
      if (colIdx === undefined) {
        rowErrors.push(`Missing column mapping for "${field}"`);
        continue;
      }
      const value = row[colIdx];
      if (value === '' || value == null || String(value).trim() === '') {
        rowErrors.push(`"${field}" is empty`);
      }
    }

    // Validate due date if mapped
    if (mapping.dueDate !== undefined) {
      const rawDate = row[mapping.dueDate];
      if (rawDate !== '' && rawDate != null) {
        // Pre-clean messy dates before validating
        let dateToValidate = String(rawDate).trim();

        // Skip validation for non-date strings —
        // transformRows will set these to null
        if (/weekly|monthly|daily|tbd|ongoing/i.test(dateToValidate)) {
          // valid — will become null in transform
        } else {
          // Extract date patterns from messy strings like
          // "1. 20/03/2026 2. 30/05/2026"
          const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b|\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g;
          const matches = [...dateToValidate.matchAll(datePattern)];
          if (matches.length > 0) {
            // Use the first match for validation purposes
            dateToValidate = matches[0][0];
          }
          const parsed = parseDate(dateToValidate, dateFormat);
          if (!parsed) {
            rowErrors.push(`Invalid due date: "${rawDate}"`);
          }
        }
      }
    }

    // Validate status if mapped (accepts aliases like "Completed" → "Closed")
    if (mapping.status !== undefined) {
      const rawStatus = String(row[mapping.status] ?? '').trim();
      if (rawStatus) {
        const resolved = resolveAlias(rawStatus, STATUS_OPTIONS, STATUS_ALIASES);
        if (!STATUS_OPTIONS.includes(resolved)) {
          rowErrors.push(`Invalid status: "${rawStatus}". Expected one of: ${STATUS_OPTIONS.join(', ')}`);
        }
      }
    }

    // Validate likelihood if mapped (accepts aliases like "Certain" → "Almost Certain")
    if (mapping.likelihood !== undefined) {
      const rawLikelihood = String(row[mapping.likelihood] ?? '').trim();
      if (rawLikelihood) {
        const resolved = resolveAlias(rawLikelihood, LIKELIHOOD_OPTIONS, LIKELIHOOD_ALIASES);
        if (!LIKELIHOOD_OPTIONS.includes(resolved)) {
          rowErrors.push(`Invalid likelihood: "${rawLikelihood}"`);
        }
      }
    }

    // Validate consequence if mapped (accepts aliases like "High" → "Major")
    if (mapping.consequence !== undefined) {
      const rawConsequence = String(row[mapping.consequence] ?? '').trim();
      if (rawConsequence) {
        const resolved = resolveAlias(rawConsequence, CONSEQUENCE_OPTIONS, CONSEQUENCE_ALIASES);
        if (!CONSEQUENCE_OPTIONS.includes(resolved)) {
          rowErrors.push(`Invalid consequence: "${rawConsequence}"`);
        }
      }
    }

    // Validate effort estimate if mapped (accepts aliases like "Easy" → "Low")
    if (mapping.effortEstimate !== undefined) {
      const rawEffort = String(row[mapping.effortEstimate] ?? '').trim();
      if (rawEffort) {
        const resolved = resolveAlias(rawEffort, EFFORT_OPTIONS, EFFORT_ALIASES);
        if (!EFFORT_OPTIONS.includes(resolved)) {
          rowErrors.push(`Invalid effort estimate: "${rawEffort}"`);
        }
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, message: rowErrors.join('; ') });
    } else {
      validRows.push(row);
    }
  }

  return { validRows, errors };
}

/**
 * Transform raw row arrays into item objects ready for database insertion.
 * @param {any[][]} rows - Raw row arrays
 * @param {{ [field]: number }} mapping - Column mapping
 * @param {string} dateFormat - 'DD/MM/YYYY' or 'MM/DD/YYYY'
 * @returns {object[]} Array of item data objects
 */
export function transformRows(rows, mapping, dateFormat = 'DD/MM/YYYY') {
  return rows.map((row) => {
    const item = {};

    for (const [field, colIdx] of Object.entries(mapping)) {
      let value = row[colIdx];
      if (value == null) value = '';

      // Handle date fields
      if (field === 'dueDate' || field === 'verificationDate' || field === 'raisedDate' || field === 'closeOutDate') {
        let dateValue = value;

        // Special pre-processing for dueDate only
        if (field === 'dueDate') {
          // Extract all DD/MM/YYYY or YYYY-MM-DD patterns from the string
          const rawStr = String(value).trim();

          // Return null for "Weekly" or similar non-dates
          if (/weekly|monthly|daily|tbd|ongoing/i.test(rawStr)) {
            value = null;
          } else {
            // Find all date-like patterns in the string
            const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b|\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g;
            const matches = [...rawStr.matchAll(datePattern)];

            if (matches.length > 1) {
              // Multiple dates found — parse each and keep the earliest
              const parsed = matches.map(m => {
                const dateStr = m[0];
                // Try parsing as DD/MM/YYYY first, then MM/DD/YYYY
                const parts = dateStr.split(/[\/\-]/);
                if (parts[0].length === 4) {
                  // YYYY-MM-DD
                  return new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                } else {
                  // DD/MM/YYYY (client format)
                  return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
                }
              }).filter(d => d && !isNaN(d.getTime()));

              if (parsed.length > 0) {
                const earliest = new Date(Math.min(...parsed.map(d => d.getTime())));
                value = earliest.toISOString().split('T')[0]; // YYYY-MM-DD
              } else {
                value = null;
              }
            } else if (matches.length === 1) {
              // Single date — leave value as-is, let existing parser handle it
              value = rawStr;
            } else {
              // No recognisable date pattern
              value = null;
            }
          }
          dateValue = value;
        }

        const parsed = parseDate(dateValue, dateFormat);
        if (parsed) {
          // Store as YYYY-MM-DD
          item[field] = parsed.toISOString().split('T')[0];
        } else {
          item[field] = String(dateValue).trim();
        }
        continue;
      }

      // Handle numeric fields
      if (field === 'effortHours') {
        const num = parseFloat(value);
        item[field] = isNaN(num) ? 0 : num;
        continue;
      }

      // Handle status — normalize case + aliases
      if (field === 'status') {
        const raw = String(value).trim();
        item[field] = resolveAlias(raw, STATUS_OPTIONS, STATUS_ALIASES) || 'Open';
        continue;
      }

      // Handle likelihood — normalize case + aliases
      if (field === 'likelihood') {
        const raw = String(value).trim();
        item[field] = resolveAlias(raw, LIKELIHOOD_OPTIONS, LIKELIHOOD_ALIASES) || 'Possible';
        continue;
      }

      // Handle consequence — normalize case + aliases
      if (field === 'consequence') {
        const raw = String(value).trim();
        item[field] = resolveAlias(raw, CONSEQUENCE_OPTIONS, CONSEQUENCE_ALIASES) || 'Moderate';
        continue;
      }

      // Handle risk level — normalize case + aliases
      if (field === 'riskLevel') {
        const raw = String(value).trim();
        const RISK_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
        item[field] = resolveAlias(raw, RISK_OPTIONS, RISK_LEVEL_ALIASES) || raw;
        continue;
      }

      // Handle effort estimate — normalize case + aliases
      if (field === 'effortEstimate') {
        const raw = String(value).trim();
        item[field] = resolveAlias(raw, EFFORT_OPTIONS, EFFORT_ALIASES) || 'Medium';
        continue;
      }

      // Handle approval status — normalize case
      if (field === 'approvalStatus') {
        const raw = String(value).trim();
        const matched = APPROVAL_OPTIONS.find(
          (a) => a.toLowerCase() === raw.toLowerCase()
        );
        item[field] = matched || raw || 'Not Required';
        continue;
      }

      item[field] = String(value).trim();
    }

    // Auto-calculate risk level if likelihood and consequence are present
    if (item.likelihood && item.consequence) {
      const calculatedRisk = calculateRiskLevel(item.likelihood, item.consequence);
      if (calculatedRisk) {
        item.riskLevel = calculatedRisk;
      }
    }

    // Default item type to Project Action if not set
    if (!item.itemType) {
      item.itemType = 'Project Action';
    }

    // Derive status if not already set to a valid value
    if (!item.status || !STATUS_OPTIONS.includes(item.status)) {
      if (
        item.verifiedAsCompleted &&
        String(item.verifiedAsCompleted).trim().toLowerCase() === 'yes'
      ) {
        item.status = 'Closed';
      } else if (item.closeOutDate && String(item.closeOutDate).trim()) {
        item.status = 'Closed';
      } else {
        item.status = 'Open';
      }
    }

    // Remove temporary field — not stored in the database
    delete item.verifiedAsCompleted;

    return item;
  });
}
