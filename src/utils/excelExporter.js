/**
 * Excel Exporter for CloseOut
 * Uses ExcelJS for generating styled .xlsx files.
 */

import ExcelJS from 'exceljs';
import { formatDate } from './dateUtils.js';

// ---------------------------------------------------------------------------
// Column definitions (matches the template order exactly)
// ---------------------------------------------------------------------------

const COLUMNS = [
  { header: 'Item ID', key: 'itemId', width: 12 },
  { header: 'Title', key: 'title', width: 40 },
  { header: 'Description', key: 'description', width: 50 },
  { header: 'Department', key: 'department', width: 18 },
  { header: 'Location', key: 'location', width: 18 },
  { header: 'Consequence', key: 'consequence', width: 16 },
  { header: 'Likelihood', key: 'likelihood', width: 16 },
  { header: 'Risk Level', key: 'riskLevel', width: 14 },
  { header: 'Effort Estimate', key: 'effortEstimate', width: 16 },
  { header: 'Effort Hours', key: 'effortHours', width: 14 },
  { header: 'Due Date', key: 'dueDate', width: 14 },
  { header: 'Assigned To', key: 'assignedTo', width: 20 },
  { header: 'Status', key: 'status', width: 22 },
  { header: 'Corrective Action', key: 'correctiveAction', width: 40 },
  { header: 'Verification Person', key: 'verificationPerson', width: 20 },
  { header: 'Verification Date', key: 'verificationDate', width: 16 },
  { header: 'Approval Status', key: 'approvalStatus', width: 18 },
  { header: 'Approver', key: 'approver', width: 18 },
];

const NAVY_BG = '1E2A3A';

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

/**
 * Style the header row (row 2 in the workbook — row 1 is the title banner).
 */
function styleHeaderRow(sheet, headerRowNumber) {
  const headerRow = sheet.getRow(headerRowNumber);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${NAVY_BG}` },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF999999' } },
      bottom: { style: 'thin', color: { argb: 'FF999999' } },
      left: { style: 'thin', color: { argb: 'FF999999' } },
      right: { style: 'thin', color: { argb: 'FF999999' } },
    };
  });
  headerRow.height = 28;
}

/**
 * Add a title/banner row merged across all columns.
 */
function addBannerRow(sheet, text, colCount) {
  const bannerRow = sheet.getRow(1);
  bannerRow.getCell(1).value = text;
  bannerRow.getCell(1).font = { bold: true, size: 14, color: { argb: `FF${NAVY_BG}` } };
  bannerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  bannerRow.height = 32;

  if (colCount > 1) {
    sheet.mergeCells(1, 1, 1, colCount);
  }
}

/**
 * Apply auto-width to all columns based on data and header widths.
 */
function autoFitColumns(sheet, columns) {
  columns.forEach((col, i) => {
    const colRef = sheet.getColumn(i + 1);
    colRef.width = col.width;
  });
}

/**
 * Convert item data to a row values object suitable for ExcelJS, respecting
 * the date format in settings.
 */
function itemToRowValues(item, dateFormat) {
  return {
    itemId: item.itemId || '',
    title: item.title || '',
    description: item.description || '',
    department: item.department || '',
    location: item.location || '',
    consequence: item.consequence || '',
    likelihood: item.likelihood || '',
    riskLevel: item.riskLevel || '',
    effortEstimate: item.effortEstimate || '',
    effortHours: item.effortHours || 0,
    dueDate: formatDate(item.dueDate, dateFormat),
    assignedTo: item.assignedTo || '',
    status: item.status || '',
    correctiveAction: item.correctiveAction || '',
    verificationPerson: item.verificationPerson || '',
    verificationDate: formatDate(item.verificationDate, dateFormat),
    approvalStatus: item.approvalStatus || '',
    approver: item.approver || '',
  };
}

/**
 * Trigger a download of the workbook buffer in the browser.
 */
function downloadBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a default filename based on project name and current date.
 */
function defaultFilename(settings) {
  const projectName = settings?.projectName || 'Project';
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  return `${safeName}_CloseOut_${dateStr}.xlsx`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export items to a styled .xlsx file and trigger download.
 * @param {object[]} items - Array of item objects
 * @param {object} settings - Project settings (for dateFormat, projectName)
 * @param {string} [filename] - Optional filename override
 */
export async function exportToExcel(items, settings = {}, filename) {
  const dateFormat = settings.dateFormat || 'DD/MM/YYYY';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CloseOut by Boronia Consulting';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('CloseOut Items');

  // Row 1: Banner
  addBannerRow(sheet, 'CloseOut by Boronia Consulting', COLUMNS.length);

  // Row 2: Headers
  const headerValues = COLUMNS.map((c) => c.header);
  const headerRow = sheet.addRow(headerValues);
  styleHeaderRow(sheet, 2);

  // Data rows
  for (const item of items) {
    const values = itemToRowValues(item, dateFormat);
    const rowData = COLUMNS.map((col) => values[col.key] ?? '');
    const dataRow = sheet.addRow(rowData);

    // Light alternating row styling
    dataRow.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      };
    });
  }

  autoFitColumns(sheet, COLUMNS);

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename || defaultFilename(settings));
}

/**
 * Export a blank template with headers and data validation hints.
 * @param {object} settings - Project settings
 */
export async function exportTemplate(settings = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CloseOut by Boronia Consulting';

  const sheet = workbook.addWorksheet('Template');

  // Row 1: Banner
  addBannerRow(sheet, 'CloseOut Import Template — Boronia Consulting', COLUMNS.length);

  // Row 2: Headers
  const headerValues = COLUMNS.map((c) => c.header);
  sheet.addRow(headerValues);
  styleHeaderRow(sheet, 2);

  // Row 3: Hint / example row showing expected values
  const hints = {
    itemId: '(auto-generated)',
    title: 'Action item title (required)',
    description: 'Detailed description',
    department: 'Mechanical | Electrical | ...',
    location: 'Module A | Pipe Rack | ...',
    consequence: 'Negligible | Minor | Moderate | Major | Catastrophic',
    likelihood: 'Rare | Unlikely | Possible | Likely | Almost Certain',
    riskLevel: '(auto-calculated)',
    effortEstimate: 'Low | Medium | High',
    effortHours: '0',
    dueDate: 'DD/MM/YYYY',
    assignedTo: 'Person name (required)',
    status: 'Open | In Progress | Pending Verification | Closed | Cancelled',
    correctiveAction: 'Corrective action description',
    verificationPerson: 'Verifier name',
    verificationDate: 'DD/MM/YYYY',
    approvalStatus: 'Not Required | Pending Approval | Approved | Rejected',
    approver: 'Approver name',
  };

  const hintRow = sheet.addRow(COLUMNS.map((col) => hints[col.key] || ''));
  hintRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: 'FF888888' }, size: 10 };
  });

  autoFitColumns(sheet, COLUMNS);

  const projectName = settings?.projectName || 'Project';
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, `${safeName}_CloseOut_Template.xlsx`);
}

/**
 * Export a filtered view of items with a filter description in the banner.
 * @param {object[]} items - Filtered items array
 * @param {object} settings - Project settings
 * @param {object} filters - Active filter object for description
 */
export async function exportFilteredView(items, settings = {}, filters = {}) {
  const dateFormat = settings.dateFormat || 'DD/MM/YYYY';

  // Build filter description
  const activeFilters = Object.entries(filters)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const filterDesc = activeFilters
    ? `Filtered view — ${activeFilters}`
    : 'All items';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CloseOut by Boronia Consulting';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Filtered Items');

  // Row 1: Banner with filter description
  addBannerRow(
    sheet,
    `CloseOut by Boronia Consulting — ${filterDesc}`,
    COLUMNS.length
  );

  // Row 2: Headers
  const headerValues = COLUMNS.map((c) => c.header);
  sheet.addRow(headerValues);
  styleHeaderRow(sheet, 2);

  // Data rows
  for (const item of items) {
    const values = itemToRowValues(item, dateFormat);
    const rowData = COLUMNS.map((col) => values[col.key] ?? '');
    const dataRow = sheet.addRow(rowData);

    dataRow.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      };
    });
  }

  autoFitColumns(sheet, COLUMNS);

  const projectName = settings?.projectName || 'Project';
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, `${safeName}_CloseOut_Filtered_${dateStr}.xlsx`);
}
