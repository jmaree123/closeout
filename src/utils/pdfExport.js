/**
 * PDF Export Utilities for CloseOut
 * Uses jsPDF + jspdf-autotable for professional PDF generation.
 *
 * Exports:
 *   - generateItemPdf(item, settings)  — single-item one-page PDF
 *   - generateReport(items, settings, options) — full project report
 *   - pdfSmokeTest() — standalone smoke test function
 */

import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

// Attach autoTable to jsPDF prototype (required for ES module bundling)
applyPlugin(jsPDF);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAVY = '#1E2A3A';
const NAVY_RGB = [30, 42, 58];
const CORAL = '#F06B6B';
const WHITE_RGB = [255, 255, 255];
const GRAY_RGB = [107, 114, 128];
const LIGHT_GRAY_RGB = [243, 244, 246];

const RISK_COLORS_RGB = {
  Critical: [220, 38, 38],
  High: [249, 115, 22],
  Medium: [234, 179, 8],
  Low: [34, 197, 94],
};

// ---------------------------------------------------------------------------
// Logo Helper — load from /src/assets/ and convert to base64
// ---------------------------------------------------------------------------

let logoBase64Cache = null;

/**
 * Load the Boronia Consulting logo as base64 JPEG data.
 * Caches the result after first load.
 * @returns {Promise<string|null>} Base64 data URL or null on failure
 */
export async function getLogoBase64() {
  if (logoBase64Cache) return logoBase64Cache;

  try {
    // Use dynamic import with Vite's ?url suffix to get the asset URL
    const logoModule = await import('../assets/boronia_consulting_logo.jpg');
    const logoUrl = logoModule.default;

    const response = await fetch(logoUrl);
    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64Cache = reader.result;
        resolve(logoBase64Cache);
      };
      reader.onerror = () => {
        console.warn('Logo FileReader failed, continuing without logo.');
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Failed to load logo:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// PDF Helpers
// ---------------------------------------------------------------------------

/**
 * Add the small Boronia logo + "CloseOut by Boronia Consulting" to page header.
 */
function addPageHeader(doc, logoData) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Logo (small, top-left)
  if (logoData) {
    try {
      doc.addImage(logoData, 'JPEG', 14, 8, 28, 12);
    } catch {
      // Silently skip if image fails
    }
  }

  // Header text
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_RGB);
  doc.text('CloseOut by Boronia Consulting', logoData ? 46 : 14, 15);

  // Thin line under header
  doc.setDrawColor(...NAVY_RGB);
  doc.setLineWidth(0.3);
  doc.line(14, 22, pageWidth - 14, 22);
}

/**
 * Add page footer with page numbers and generated date.
 */
function addPageFooter(doc, pageNum, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(7);
  doc.setTextColor(...GRAY_RGB);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  doc.text('Boronia Consulting', 14, pageHeight - 8);
  doc.text(new Date().toLocaleDateString(), pageWidth - 14, pageHeight - 8, { align: 'right' });
}

/**
 * Add a navy section header bar.
 */
function addSectionHeader(doc, text, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY_RGB);
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE_RGB);
  doc.text(text, 17, y + 5.5);
  doc.setTextColor(0, 0, 0);
  return y + 12;
}

/**
 * Check if we need a new page and add one if so.
 */
function checkPageBreak(doc, currentY, needed, logoData) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + needed > pageHeight - 20) {
    doc.addPage();
    addPageHeader(doc, logoData);
    return 28;
  }
  return currentY;
}

// ---------------------------------------------------------------------------
// generateItemPdf — single-item one-page PDF
// ---------------------------------------------------------------------------

/**
 * Generate a single-item one-page landscape A4 PDF.
 * @param {object} item - The item data
 * @param {object} settings - Project settings
 */
export async function generateItemPdf(item, settings = {}) {
  const logoData = await getLogoBase64();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  addPageHeader(doc, logoData);

  let y = 28;

  // Item ID + Title
  doc.setFontSize(16);
  doc.setTextColor(...NAVY_RGB);
  doc.setFont('helvetica', 'bold');
  doc.text(`${item.itemId || ''}  —  ${item.title || 'Untitled'}`, 14, y);
  doc.setFont('helvetica', 'normal');
  y += 10;

  // Two-column layout
  const colWidth = (pageWidth - 42) / 2;
  const leftX = 14;
  const rightX = leftX + colWidth + 14;

  // Section header: Details
  y = addSectionHeader(doc, 'Item Details', y);

  const leftFields = [
    ['Status', item.status || 'Open'],
    ['Risk Level', item.riskLevel || 'Medium'],
    ['Likelihood', item.likelihood || ''],
    ['Consequence', item.consequence || ''],
    ['Effort Estimate', item.effortEstimate || ''],
    ['Priority', item.priority || 'None'],
  ];

  const rightFields = [
    ['Assigned To', item.assignedTo || ''],
    ['Department', item.department || ''],
    ['Location', item.location || ''],
    ['Due Date', item.dueDate || ''],
    ['Raised Date', item.raisedDate || ''],
    ['Source', item.source || ''],
  ];

  doc.setFontSize(9);
  let rowY = y;

  leftFields.forEach(([label, value], idx) => {
    const fy = rowY + idx * 7;
    doc.setTextColor(...GRAY_RGB);
    doc.text(label + ':', leftX, fy);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(value, leftX + 35, fy);
    doc.setFont('helvetica', 'normal');
  });

  rightFields.forEach(([label, value], idx) => {
    const fy = rowY + idx * 7;
    doc.setTextColor(...GRAY_RGB);
    doc.text(label + ':', rightX, fy);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(value, rightX + 35, fy);
    doc.setFont('helvetica', 'normal');
  });

  y = rowY + leftFields.length * 7 + 6;

  // Description section
  if (item.description) {
    y = addSectionHeader(doc, 'Description', y);
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const descLines = doc.splitTextToSize(item.description, pageWidth - 28);
    doc.text(descLines, 14, y);
    y += descLines.length * 4.5 + 6;
  }

  // Corrective Action section
  if (item.correctiveAction) {
    y = addSectionHeader(doc, 'Corrective Action', y);
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const actionLines = doc.splitTextToSize(item.correctiveAction, pageWidth - 28);
    doc.text(actionLines, 14, y);
    y += actionLines.length * 4.5 + 6;
  }

  // Footer
  addPageFooter(doc, 1, 1);

  // Download
  const filename = `${item.itemId || 'Item'}_CloseOut.pdf`;
  doc.save(filename);
}

// ---------------------------------------------------------------------------
// generateReport — full project report
// ---------------------------------------------------------------------------

/**
 * Generate a full project report PDF.
 * @param {object[]} items - All items to include
 * @param {object} settings - Project settings
 * @param {object} options - Report options
 * @param {object} [chartImages] - Optional { riskMatrix: base64, scatter: base64 }
 */
export async function generateReport(items, settings = {}, options = {}, chartImages = {}) {
  const {
    includeCoverPage = true,
    includeExecutiveSummary = true,
    includeRiskMatrix = true,
    includeScatter = false,
    includeOverdueTable = true,
    includeByPerson = true,
    includeFullRegister = true,
    commentary = '',
  } = options;

  const logoData = await getLogoBase64();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let currentPage = 0;

  function newPage(skipFirst = false) {
    if (skipFirst && currentPage === 0) {
      currentPage = 1;
      return;
    }
    doc.addPage();
    currentPage++;
    addPageHeader(doc, logoData);
  }

  // ---- 1. Cover Page ----
  if (includeCoverPage) {
    currentPage = 1;

    // Centered logo
    if (logoData) {
      try {
        doc.addImage(logoData, 'JPEG', (pageWidth - 60) / 2, 30, 60, 26);
      } catch {
        // Skip logo on failure
      }
    }

    let cy = 70;

    // Project name
    const projectName = settings?.projectName || 'Project';
    doc.setFontSize(28);
    doc.setTextColor(...NAVY_RGB);
    doc.setFont('helvetica', 'bold');
    doc.text(projectName, pageWidth / 2, cy, { align: 'center' });
    cy += 14;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('CloseOut Report', pageWidth / 2, cy, { align: 'center' });
    cy += 10;

    doc.setFontSize(11);
    doc.setTextColor(...GRAY_RGB);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, cy, { align: 'center' });
    cy += 14;

    // Commentary
    if (commentary) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const commentLines = doc.splitTextToSize(commentary, pageWidth - 80);
      doc.text(commentLines, pageWidth / 2, cy, { align: 'center', maxWidth: pageWidth - 80 });
      cy += commentLines.length * 5 + 10;
    }

    doc.setFontSize(10);
    doc.setTextColor(...GRAY_RGB);
    doc.text('Prepared by Boronia Consulting', pageWidth / 2, pageHeight - 20, { align: 'center' });
  }

  // ---- 2. Executive Summary ----
  if (includeExecutiveSummary) {
    newPage(includeCoverPage ? false : true);
    let y = 28;

    y = addSectionHeader(doc, 'Executive Summary', y);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const totalItems = items.length;
    const openItems = items.filter(
      (i) => i.status === 'Open' || i.status === 'In Progress' || i.status === 'Pending Verification'
    ).length;
    const overdueItems = items.filter(
      (i) =>
        i.dueDate &&
        i.dueDate < today &&
        i.status !== 'Closed' &&
        i.status !== 'Cancelled'
    ).length;
    const closedThisMonth = items.filter(
      (i) => i.status === 'Closed' && i.closeOutDate && i.closeOutDate >= thisMonthStart
    ).length;

    // Avg days to close
    const closedItems = items.filter((i) => i.status === 'Closed' && i.raisedDate && i.closeOutDate);
    let avgDays = 0;
    if (closedItems.length > 0) {
      let total = 0;
      for (const ci of closedItems) {
        const raised = new Date(ci.raisedDate);
        const closed = new Date(ci.closeOutDate);
        total += Math.max(0, Math.ceil((closed - raised) / (1000 * 60 * 60 * 24)));
      }
      avgDays = Math.round(total / closedItems.length);
    }

    doc.autoTable({
      startY: y,
      head: [['KPI', 'Value']],
      body: [
        ['Total Items', String(totalItems)],
        ['Open Items', String(openItems)],
        ['Overdue Items', String(overdueItems)],
        ['Closed This Month', String(closedThisMonth)],
        ['Avg Days to Close', avgDays > 0 ? `${avgDays} days` : 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: NAVY_RGB, textColor: WHITE_RGB, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: LIGHT_GRAY_RGB },
      margin: { left: 14, right: 14 },
      tableWidth: 120,
    });
  }

  // ---- 3. Risk Matrix ----
  if (includeRiskMatrix) {
    newPage();
    let y = 28;
    y = addSectionHeader(doc, 'Risk Matrix', y);

    if (chartImages.riskMatrix) {
      try {
        doc.addImage(chartImages.riskMatrix, 'PNG', 14, y, pageWidth - 28, 120);
      } catch {
        doc.setFontSize(10);
        doc.setTextColor(...GRAY_RGB);
        doc.text('Risk Matrix — see app for interactive view', 14, y + 10);
      }
    } else {
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_RGB);
      doc.text('Risk Matrix — see app for interactive view', 14, y + 10);
    }
  }

  // ---- 3b. Scatter (if selected) ----
  if (includeScatter) {
    newPage();
    let y = 28;
    y = addSectionHeader(doc, 'Risk vs Effort Scatter', y);

    if (chartImages.scatter) {
      try {
        doc.addImage(chartImages.scatter, 'PNG', 14, y, pageWidth - 28, 120);
      } catch {
        doc.setFontSize(10);
        doc.setTextColor(...GRAY_RGB);
        doc.text('Risk vs Effort Scatter — see app for interactive view', 14, y + 10);
      }
    } else {
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_RGB);
      doc.text('Risk vs Effort Scatter — see app for interactive view', 14, y + 10);
    }
  }

  // ---- 4. Overdue Items Table ----
  if (includeOverdueTable) {
    newPage();
    let y = 28;
    y = addSectionHeader(doc, 'Overdue Items', y);

    const today = new Date().toISOString().split('T')[0];
    const overdueList = items
      .filter(
        (i) =>
          i.dueDate &&
          i.dueDate < today &&
          i.status !== 'Closed' &&
          i.status !== 'Cancelled'
      )
      .map((i) => {
        const daysOver = Math.ceil(
          (new Date(today) - new Date(i.dueDate)) / (1000 * 60 * 60 * 24)
        );
        return { ...i, daysOverdue: daysOver };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 20);

    if (overdueList.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_RGB);
      doc.text('No overdue items.', 14, y + 6);
    } else {
      doc.autoTable({
        startY: y,
        head: [['Item ID', 'Title', 'Assigned To', 'Due Date', 'Days Overdue', 'Risk Level']],
        body: overdueList.map((i) => [
          i.itemId || '',
          (i.title || '').substring(0, 50),
          i.assignedTo || '',
          i.dueDate || '',
          String(i.daysOverdue),
          i.riskLevel || '',
        ]),
        theme: 'grid',
        headStyles: { fillColor: NAVY_RGB, textColor: WHITE_RGB, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: LIGHT_GRAY_RGB },
        margin: { left: 14, right: 14 },
        columnStyles: {
          1: { cellWidth: 80 },
        },
      });
    }
  }

  // ---- 5. Open by Person ----
  if (includeByPerson) {
    newPage();
    let y = 28;
    y = addSectionHeader(doc, 'Open Items by Person', y);

    const today = new Date().toISOString().split('T')[0];
    const grouped = {};
    for (const item of items) {
      if (item.status === 'Closed' || item.status === 'Cancelled') continue;
      const person = item.assignedTo || 'Unassigned';
      if (!grouped[person]) grouped[person] = { open: 0, overdue: 0 };
      grouped[person].open++;
      if (item.dueDate && item.dueDate < today) {
        grouped[person].overdue++;
      }
    }

    const personRows = Object.entries(grouped)
      .sort((a, b) => b[1].open - a[1].open)
      .map(([person, counts]) => [person, String(counts.open), String(counts.overdue)]);

    if (personRows.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_RGB);
      doc.text('No open items.', 14, y + 6);
    } else {
      doc.autoTable({
        startY: y,
        head: [['Person', 'Open Count', 'Overdue Count']],
        body: personRows,
        theme: 'grid',
        headStyles: { fillColor: NAVY_RGB, textColor: WHITE_RGB, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: LIGHT_GRAY_RGB },
        margin: { left: 14, right: 14 },
        tableWidth: 180,
      });
    }
  }

  // ---- 6. Full Register ----
  if (includeFullRegister) {
    newPage();
    let y = 28;
    y = addSectionHeader(doc, 'Full Item Register', y);

    const registerRows = items.map((i) => [
      i.itemId || '',
      (i.title || '').substring(0, 45),
      i.status || '',
      i.riskLevel || '',
      i.assignedTo || '',
      i.department || '',
      i.dueDate || '',
    ]);

    doc.autoTable({
      startY: y,
      head: [['Item ID', 'Title', 'Status', 'Risk', 'Assigned To', 'Department', 'Due Date']],
      body: registerRows,
      theme: 'grid',
      headStyles: { fillColor: NAVY_RGB, textColor: WHITE_RGB, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: LIGHT_GRAY_RGB },
      margin: { left: 14, right: 14 },
      columnStyles: {
        1: { cellWidth: 70 },
      },
      // Auto-paginate built into jspdf-autotable
      didDrawPage: (data) => {
        addPageHeader(doc, logoData);
      },
    });
  }

  // ---- Add page numbers to all pages ----
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, totalPages);
  }

  // Download
  const projectName = settings?.projectName || 'Project';
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${safeName}_CloseOut_Report_${dateStr}.pdf`;
  doc.save(filename);

  return doc;
}

// ---------------------------------------------------------------------------
// pdfSmokeTest — standalone test function
// ---------------------------------------------------------------------------

/**
 * Creates a minimal PDF to verify jsPDF + jspdf-autotable are working.
 * Works standalone without any database data.
 * @returns {jsPDF} The doc object (caller can save/download)
 */
export async function pdfSmokeTest() {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Try to load logo
  let logoData = null;
  try {
    logoData = await getLogoBase64();
  } catch {
    // Continue without logo
  }

  // Logo or placeholder
  if (logoData) {
    try {
      doc.addImage(logoData, 'JPEG', (pageWidth - 50) / 2, 15, 50, 22);
    } catch {
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_RGB);
      doc.text('[Logo placeholder]', pageWidth / 2, 25, { align: 'center' });
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_RGB);
    doc.text('[Logo placeholder — asset not available]', pageWidth / 2, 25, { align: 'center' });
  }

  // Title
  doc.setFontSize(22);
  doc.setTextColor(...NAVY_RGB);
  doc.setFont('helvetica', 'bold');
  doc.text('CloseOut — PDF Smoke Test', pageWidth / 2, 50, { align: 'center' });

  // Subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_RGB);
  doc.text(
    `Generated: ${new Date().toLocaleString()} — jsPDF + jspdf-autotable verification`,
    pageWidth / 2,
    60,
    { align: 'center' }
  );

  // Section header
  doc.setFillColor(...NAVY_RGB);
  doc.rect(14, 70, pageWidth - 28, 8, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE_RGB);
  doc.text('Sample Data Table', 17, 75.5);

  // Sample table using jspdf-autotable
  doc.autoTable({
    startY: 82,
    head: [['Item ID', 'Title', 'Status', 'Risk Level', 'Assigned To', 'Due Date']],
    body: [
      ['ACT-001', 'Install pressure relief valve on Line 42-A', 'Open', 'High', 'John Smith', '2026-03-15'],
      ['PUN-001', 'Missing nameplate on valve V-12B', 'In Progress', 'Medium', 'Sarah Chen', '2026-03-20'],
      ['AUD-001', 'Non-conformance: welding procedure not followed', 'Pending Verification', 'Critical', 'Mike Okonkwo', '2026-02-28'],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: NAVY_RGB,
      textColor: WHITE_RGB,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: LIGHT_GRAY_RGB },
    margin: { left: 14, right: 14 },
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_RGB);
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.text('Boronia Consulting — Smoke Test Passed', pageWidth / 2, pageHeight - 10, {
    align: 'center',
  });

  // Save
  doc.save('CloseOut_PDF_Smoke_Test.pdf');

  return doc;
}
