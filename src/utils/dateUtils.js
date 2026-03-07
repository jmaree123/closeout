/**
 * Date utility functions for CloseOut
 * Handles formatting, parsing, and relative time calculations.
 */

import {
  format,
  parse,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  addDays,
  isValid,
  startOfDay,
} from 'date-fns';
import { translations } from '../i18n/translations.js';

/**
 * Get the number of days an item is overdue.
 * @param {string} dueDate - Due date string
 * @param {string} status - Current item status
 * @returns {number|null} Days overdue (0 if not overdue, null if closed/cancelled)
 */
export function getDaysOverdue(dueDate, status) {
  if (!dueDate) return null;
  if (status === 'Closed' || status === 'Cancelled') return null;

  const due = parseDateSafe(dueDate);
  if (!due) return null;

  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);
  const diff = differenceInDays(today, dueDay);

  return diff > 0 ? diff : 0;
}

/**
 * Format a date string according to the given format setting.
 * @param {string} dateStr - Date string (ISO, YYYY-MM-DD, or other parseable format)
 * @param {string} fmt - 'DD/MM/YYYY' or 'MM/DD/YYYY'
 * @returns {string} Formatted date string or empty string if invalid
 */
export function formatDate(dateStr, fmt = 'DD/MM/YYYY') {
  if (!dateStr) return '';

  const date = parseDateSafe(dateStr);
  if (!date) return '';

  if (fmt === 'MM/DD/YYYY') {
    return format(date, 'MM/dd/yyyy');
  }
  // Default DD/MM/YYYY
  return format(date, 'dd/MM/yyyy');
}

/**
 * Parse a date string to a JS Date object.
 * Handles DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, ISO strings, and Excel serial numbers.
 * @param {string|number} dateStr - Date string or Excel serial number
 * @param {string} fmt - Expected format hint ('DD/MM/YYYY' or 'MM/DD/YYYY')
 * @returns {Date|null} Parsed Date or null if invalid
 */
export function parseDate(dateStr, fmt = 'DD/MM/YYYY') {
  if (dateStr == null || dateStr === '') return null;

  // Handle Excel serial numbers (numbers like 45000)
  if (typeof dateStr === 'number' || (!isNaN(dateStr) && String(dateStr).match(/^\d{4,5}(\.\d+)?$/))) {
    const serial = typeof dateStr === 'number' ? dateStr : parseFloat(dateStr);
    if (serial > 1 && serial < 200000) {
      return excelSerialToDate(serial);
    }
  }

  const str = String(dateStr).trim();

  // Try ISO format first (YYYY-MM-DD or full ISO timestamp)
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = new Date(str);
    if (isValid(d)) return d;
  }

  // Try DD/MM/YYYY
  if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    if (fmt === 'MM/DD/YYYY') {
      const d = parse(str, 'MM/dd/yyyy', new Date());
      if (isValid(d)) return d;
    } else {
      const d = parse(str, 'dd/MM/yyyy', new Date());
      if (isValid(d)) return d;
    }
    // If the preferred format fails, try the other
    if (fmt === 'DD/MM/YYYY') {
      const d = parse(str, 'MM/dd/yyyy', new Date());
      if (isValid(d)) return d;
    } else {
      const d = parse(str, 'dd/MM/yyyy', new Date());
      if (isValid(d)) return d;
    }
  }

  // Try DD-MM-YYYY or MM-DD-YYYY with dashes
  if (str.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
    if (fmt === 'MM/DD/YYYY') {
      const d = parse(str, 'MM-dd-yyyy', new Date());
      if (isValid(d)) return d;
    } else {
      const d = parse(str, 'dd-MM-yyyy', new Date());
      if (isValid(d)) return d;
    }
  }

  // Last resort: try native Date parsing
  const fallback = new Date(str);
  if (isValid(fallback)) return fallback;

  return null;
}

/**
 * Convert an Excel serial date number to a JS Date.
 * Excel epoch starts on 1900-01-01 (serial 1), but has a bug treating 1900 as leap year.
 * @param {number} serial - Excel serial date number
 * @returns {Date} JS Date
 */
function excelSerialToDate(serial) {
  // Excel epoch: 1899-12-30 (accounting for the Excel leap year bug)
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(epoch.getTime() + serial * msPerDay);
}

/**
 * Safely parse a date string, trying multiple strategies.
 * @param {string|number} dateStr - Date input
 * @returns {Date|null} Parsed date or null
 */
function parseDateSafe(dateStr) {
  if (!dateStr) return null;

  // If already a Date object
  if (dateStr instanceof Date) {
    return isValid(dateStr) ? dateStr : null;
  }

  // Try ISO / native first
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = new Date(dateStr);
    if (isValid(d)) return d;
  }

  // Try parseDate with default format
  return parseDate(dateStr, 'DD/MM/YYYY');
}

/**
 * Check if an item is overdue.
 * @param {string} dueDate - Due date string
 * @param {string} status - Current item status
 * @returns {boolean} True if overdue
 */
export function isOverdue(dueDate, status) {
  if (!dueDate) return false;
  if (status === 'Closed' || status === 'Cancelled') return false;

  const due = parseDateSafe(dueDate);
  if (!due) return false;

  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);
  return today > dueDay;
}

/**
 * Get the number of days until due date (negative if overdue).
 * @param {string} dueDate - Due date string
 * @returns {number|null} Days until due (negative = overdue), null if invalid
 */
export function getDaysUntilDue(dueDate) {
  if (!dueDate) return null;

  const due = parseDateSafe(dueDate);
  if (!due) return null;

  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);
  return differenceInDays(dueDay, today);
}

/**
 * Get relative time string for activity log display.
 * @param {string} timestamp - ISO timestamp
 * @param {string} lang - Language code ('en' or 'fr')
 * @returns {string} e.g. "2 hours ago", "3 days ago", "just now"
 */
export function getRelativeTime(timestamp, lang = 'en') {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  if (!isValid(date)) return '';

  const s = translations[lang] || translations.en;

  const now = new Date();

  const seconds = differenceInSeconds(now, date);
  if (seconds < 60) return s.time_just_now;

  const minutes = differenceInMinutes(now, date);
  if (minutes < 60) return `${minutes} ${s.time_minutes_ago}`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours} ${s.time_hours_ago}`;

  const days = differenceInDays(now, date);
  if (days < 30) return `${days} ${s.time_days_ago}`;

  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${s.time_months_ago}`;
  }

  const years = Math.floor(days / 365);
  return `${years} ${s.time_years_ago}`;
}

/**
 * Get a default due date as YYYY-MM-DD string, offset from today.
 * @param {number} offsetDays - Number of days from today (default 14)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getDefaultDueDate(offsetDays = 14) {
  const date = addDays(new Date(), offsetDays);
  return format(date, 'yyyy-MM-dd');
}
