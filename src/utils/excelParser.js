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
};

// ---------------------------------------------------------------------------
// Fuzzy Column Aliases
// ---------------------------------------------------------------------------

const COLUMN_ALIASES = {
  title: ['title', 'description', 'action', 'finding', 'item', 'action item', 'subject'],
  riskLevel: ['risk', 'risk level', 'risk rating', 'severity'],
  likelihood: ['likelihood', 'probability', 'freq', 'frequency'],
  consequence: ['consequence', 'impact', 'severity', 'effect'],
  effortEstimate: ['effort', 'effort estimate', 'complexity'],
  dueDate: ['due date', 'target date', 'close-out date', 'deadline', 'target'],
  assignedTo: ['assigned to', 'responsible', 'owner', 'action owner', 'responsible party'],
  department: ['department', 'dept', 'discipline', 'group', 'team'],
  location: ['location', 'area', 'site', 'module', 'system', 'zone'],
  status: ['status', 'state', 'progress', 'completion'],
  correctiveAction: ['corrective action', 'action required', 'remediation', 'action description'],
  verificationPerson: ['verified by', 'verification', 'checker', 'reviewer'],
  raisedBy: ['raised by', 'identified by', 'originator', 'reported by'],
  raisedDate: ['raised date', 'date raised', 'open date', 'issue date', 'date identified'],
  source: ['source', 'meeting', 'audit', 'origin', 'reference'],
};

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
  const requiredFields = ['title', 'dueDate', 'assignedTo', 'department', 'status'];

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
        const parsed = parseDate(rawDate, dateFormat);
        if (!parsed) {
          rowErrors.push(`Invalid due date: "${rawDate}"`);
        }
      }
    }

    // Validate status if mapped
    if (mapping.status !== undefined) {
      const rawStatus = String(row[mapping.status] ?? '').trim();
      if (rawStatus && !STATUS_OPTIONS.includes(rawStatus)) {
        // Try case-insensitive match
        const matched = STATUS_OPTIONS.find(
          (s) => s.toLowerCase() === rawStatus.toLowerCase()
        );
        if (!matched) {
          rowErrors.push(`Invalid status: "${rawStatus}". Expected one of: ${STATUS_OPTIONS.join(', ')}`);
        }
      }
    }

    // Validate likelihood if mapped
    if (mapping.likelihood !== undefined) {
      const rawLikelihood = String(row[mapping.likelihood] ?? '').trim();
      if (rawLikelihood && !LIKELIHOOD_OPTIONS.includes(rawLikelihood)) {
        const matched = LIKELIHOOD_OPTIONS.find(
          (l) => l.toLowerCase() === rawLikelihood.toLowerCase()
        );
        if (!matched) {
          rowErrors.push(`Invalid likelihood: "${rawLikelihood}"`);
        }
      }
    }

    // Validate consequence if mapped
    if (mapping.consequence !== undefined) {
      const rawConsequence = String(row[mapping.consequence] ?? '').trim();
      if (rawConsequence && !CONSEQUENCE_OPTIONS.includes(rawConsequence)) {
        const matched = CONSEQUENCE_OPTIONS.find(
          (c) => c.toLowerCase() === rawConsequence.toLowerCase()
        );
        if (!matched) {
          rowErrors.push(`Invalid consequence: "${rawConsequence}"`);
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
      if (field === 'dueDate' || field === 'verificationDate' || field === 'raisedDate') {
        const parsed = parseDate(value, dateFormat);
        if (parsed) {
          // Store as YYYY-MM-DD
          item[field] = parsed.toISOString().split('T')[0];
        } else {
          item[field] = String(value).trim();
        }
        continue;
      }

      // Handle numeric fields
      if (field === 'effortHours') {
        const num = parseFloat(value);
        item[field] = isNaN(num) ? 0 : num;
        continue;
      }

      // Handle status — normalize case
      if (field === 'status') {
        const raw = String(value).trim();
        const matched = STATUS_OPTIONS.find(
          (s) => s.toLowerCase() === raw.toLowerCase()
        );
        item[field] = matched || raw || 'Open';
        continue;
      }

      // Handle likelihood — normalize case
      if (field === 'likelihood') {
        const raw = String(value).trim();
        const matched = LIKELIHOOD_OPTIONS.find(
          (l) => l.toLowerCase() === raw.toLowerCase()
        );
        item[field] = matched || raw || 'Possible';
        continue;
      }

      // Handle consequence — normalize case
      if (field === 'consequence') {
        const raw = String(value).trim();
        const matched = CONSEQUENCE_OPTIONS.find(
          (c) => c.toLowerCase() === raw.toLowerCase()
        );
        item[field] = matched || raw || 'Moderate';
        continue;
      }

      // Handle effort estimate — normalize case
      if (field === 'effortEstimate') {
        const raw = String(value).trim();
        const matched = EFFORT_OPTIONS.find(
          (e) => e.toLowerCase() === raw.toLowerCase()
        );
        item[field] = matched || raw || 'Medium';
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

    return item;
  });
}
