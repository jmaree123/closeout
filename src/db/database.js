/**
 * Dexie Database Layer for CloseOut
 * Provides all CRUD operations for items, activity logs, and settings.
 */

import Dexie from 'dexie';
import { calculateRiskLevel, calculatePriority } from '../utils/riskMatrix.js';

// ---------------------------------------------------------------------------
// Database Setup
// ---------------------------------------------------------------------------

const db = new Dexie('CloseOutDB');

db.version(1).stores({
  items:
    '++id, itemId, itemType, status, riskLevel, assignedTo, department, location, dueDate, raisedDate, isArchived',
  activityLog: '++id, itemId, timestamp',
  settings: 'id',
});

export default db;

// ---------------------------------------------------------------------------
// Default Settings
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS = {
  id: 'project',
  projectName: '',
  departments: [
    'Mechanical',
    'Electrical',
    'Instrumentation',
    'Civil',
    'QHSE',
    'Project Controls',
  ],
  locations: [
    'Fabrication Yard',
    'Module A',
    'Module B',
    'Pipe Rack',
    'Control Room',
  ],
  teamMembers: [],
  defaultDueDateOffset: 14,
  dateFormat: 'DD/MM/YYYY',
  language: 'en',
  onboardingComplete: false,
};

// ---------------------------------------------------------------------------
// Settings CRUD
// ---------------------------------------------------------------------------

/**
 * Initialise settings with defaults if they do not yet exist.
 */
export async function initializeSettings() {
  const existing = await db.settings.get('project');
  if (!existing) {
    await db.settings.put({ ...DEFAULT_SETTINGS });
  }
  return getSettings();
}

/**
 * Return current settings (singleton row).
 */
export async function getSettings() {
  return (await db.settings.get('project')) || { ...DEFAULT_SETTINGS };
}

/**
 * Merge partial changes into settings.
 */
export async function updateSettings(changes) {
  const current = await getSettings();
  const updated = { ...current, ...changes, id: 'project' };
  await db.settings.put(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Item ID Generation
// ---------------------------------------------------------------------------

const TYPE_PREFIX_MAP = {
  'Project Action': 'ACT',
  'Punch Item': 'PUN',
  'Audit Finding': 'AUD',
};

/**
 * Generate the next sequential item ID for the given type.
 * E.g. ACT-001, ACT-002, PUN-001
 */
export async function getNextItemId(itemType) {
  const prefix = TYPE_PREFIX_MAP[itemType] || 'ITM';
  const allOfType = await db.items
    .where('itemType')
    .equals(itemType)
    .toArray();

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`);

  for (const item of allOfType) {
    if (item.itemId) {
      const match = item.itemId.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Activity Log Helpers
// ---------------------------------------------------------------------------

async function logActivity(itemId, action, field = '', oldValue = '', newValue = '') {
  await db.activityLog.add({
    itemId,
    action,
    field,
    oldValue: String(oldValue ?? ''),
    newValue: String(newValue ?? ''),
    timestamp: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Item CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new item. Auto-generates itemId if not provided, sets timestamps,
 * auto-calculates riskLevel from likelihood + consequence, and logs creation.
 * @param {object} data - Item fields
 * @returns {object} The created item (with auto-increment id)
 */
export async function createItem(data) {
  const now = new Date().toISOString();
  const itemType = data.itemType || 'Project Action';
  const itemId = data.itemId || (await getNextItemId(itemType));

  // Auto-calculate risk level if likelihood and consequence are present
  let riskLevel = data.riskLevel;
  if (data.likelihood && data.consequence) {
    riskLevel = calculateRiskLevel(data.likelihood, data.consequence) || riskLevel;
  }

  const item = {
    itemId,
    itemType,
    title: data.title || '',
    description: data.description || '',
    riskLevel: riskLevel || 'Medium',
    likelihood: data.likelihood || 'Possible',
    consequence: data.consequence || 'Moderate',
    effortEstimate: data.effortEstimate || 'Medium',
    effortHours: data.effortHours || 0,
    dueDate: data.dueDate || '',
    assignedTo: data.assignedTo || '',
    department: data.department || '',
    location: data.location || '',
    correctiveAction: data.correctiveAction || '',
    verificationPerson: data.verificationPerson || '',
    verificationDate: data.verificationDate || '',
    status: data.status || 'Open',
    approvalStatus: data.approvalStatus || 'Not Required',
    approver: data.approver || '',
    closeOutDate: data.closeOutDate || '',
    closeOutNote: data.closeOutNote || '',
    raisedBy: data.raisedBy || '',
    raisedDate: data.raisedDate || now.split('T')[0],
    source: data.source || '',
    priority: calculatePriority(data.effortEstimate || 'Medium', riskLevel || 'Medium') || '',
    tags: data.tags || '',
    createdAt: data.createdAt || now,
    updatedAt: now,
    isArchived: data.isArchived ?? false,
  };

  const id = await db.items.add(item);
  item.id = id;

  await logActivity(item.itemId, 'Item created');

  return item;
}

/**
 * Update an item. Diffs changed fields, logs each change, auto-recalculates
 * riskLevel when likelihood or consequence changes.
 * @param {number} id - Auto-increment primary key
 * @param {object} changes - Partial field updates
 * @returns {object} Updated item
 */
export async function updateItem(id, changes) {
  const existing = await db.items.get(id);
  if (!existing) throw new Error(`Item with id ${id} not found`);

  // Determine if risk recalculation is needed
  let recalcRisk = false;
  const updatedLikelihood =
    changes.likelihood !== undefined ? changes.likelihood : existing.likelihood;
  const updatedConsequence =
    changes.consequence !== undefined ? changes.consequence : existing.consequence;

  if (
    (changes.likelihood !== undefined && changes.likelihood !== existing.likelihood) ||
    (changes.consequence !== undefined && changes.consequence !== existing.consequence)
  ) {
    recalcRisk = true;
  }

  if (recalcRisk) {
    const newRisk = calculateRiskLevel(updatedLikelihood, updatedConsequence);
    if (newRisk) {
      changes.riskLevel = newRisk;
    }
  }

  // Auto-recalculate priority when effort or risk changes
  const updatedEffort = changes.effortEstimate !== undefined ? changes.effortEstimate : existing.effortEstimate;
  const updatedRisk = changes.riskLevel !== undefined ? changes.riskLevel : existing.riskLevel;
  if (
    changes.effortEstimate !== undefined ||
    changes.riskLevel !== undefined ||
    recalcRisk
  ) {
    const newPriority = calculatePriority(updatedEffort, updatedRisk);
    if (newPriority) {
      changes.priority = newPriority;
    }
  }

  changes.updatedAt = new Date().toISOString();

  // Log each changed field
  const fieldsToSkip = new Set(['updatedAt']);
  for (const [key, newVal] of Object.entries(changes)) {
    if (fieldsToSkip.has(key)) continue;
    const oldVal = existing[key];
    if (oldVal !== newVal) {
      const label = fieldLabel(key);
      await logActivity(
        existing.itemId,
        `${label} changed from "${oldVal ?? ''}" to "${newVal ?? ''}"`,
        key,
        oldVal,
        newVal
      );
    }
  }

  await db.items.update(id, changes);
  return { ...existing, ...changes };
}

/**
 * Archive an item (soft delete).
 */
export async function archiveItem(id) {
  const item = await db.items.get(id);
  if (!item) throw new Error(`Item with id ${id} not found`);

  await db.items.update(id, { isArchived: true, updatedAt: new Date().toISOString() });
  await logActivity(item.itemId, 'Item archived');
}

/**
 * Restore an archived item.
 */
export async function restoreItem(id) {
  const item = await db.items.get(id);
  if (!item) throw new Error(`Item with id ${id} not found`);

  await db.items.update(id, { isArchived: false, updatedAt: new Date().toISOString() });
  await logActivity(item.itemId, 'Item restored from archive');
}

/**
 * Change item status. Also sets closeOutDate when closing.
 */
export async function changeStatus(id, newStatus) {
  const changes = { status: newStatus };
  if (newStatus === 'Closed') {
    changes.closeOutDate = new Date().toISOString().split('T')[0];
  }
  return updateItem(id, changes);
}

/**
 * Bulk-update status for multiple items.
 * @param {number[]} ids - Array of primary keys
 * @param {string} newStatus
 */
export async function bulkUpdateStatus(ids, newStatus) {
  const results = [];
  for (const id of ids) {
    results.push(await changeStatus(id, newStatus));
  }
  return results;
}

/**
 * Bulk-assign items to a person.
 * @param {number[]} ids - Array of primary keys
 * @param {string} assignedTo
 */
export async function bulkAssign(ids, assignedTo) {
  const results = [];
  for (const id of ids) {
    results.push(await updateItem(id, { assignedTo }));
  }
  return results;
}

/**
 * Duplicate an item: creates a copy with a new itemId, status reset to Open,
 * and close-out fields cleared.
 */
export async function duplicateItem(id) {
  const original = await db.items.get(id);
  if (!original) throw new Error(`Item with id ${id} not found`);

  const { id: _id, itemId: _itemId, ...rest } = original;

  return createItem({
    ...rest,
    status: 'Open',
    closeOutDate: '',
    closeOutNote: '',
    verificationDate: '',
    verificationPerson: '',
    approvalStatus: 'Not Required',
    approver: '',
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return all non-archived items, sorted by createdAt descending.
 */
export async function getAllItems() {
  const all = await db.items.toArray();
  return all
    .filter((i) => !i.isArchived)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/**
 * Return all archived items.
 */
export async function getArchivedItems() {
  const all = await db.items.toArray();
  return all
    .filter((i) => i.isArchived === true)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

/**
 * Get a single item by its user-facing itemId string (e.g. "ACT-001").
 */
export async function getItemByItemId(itemId) {
  return db.items.where('itemId').equals(itemId).first();
}

/**
 * Get activity log entries for an item, newest first.
 */
export async function getActivityLog(itemId) {
  const entries = await db.activityLog
    .where('itemId')
    .equals(itemId)
    .toArray();

  return entries.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

/**
 * Return items that are overdue (status not Closed/Cancelled, dueDate < today).
 */
export async function getOverdueItems() {
  const today = new Date().toISOString().split('T')[0];
  const all = await db.items.toArray();

  return all.filter(
    (item) =>
      !item.isArchived &&
      item.dueDate &&
      item.dueDate < today &&
      item.status !== 'Closed' &&
      item.status !== 'Cancelled'
  );
}

// ---------------------------------------------------------------------------
// Bulk Operations
// ---------------------------------------------------------------------------

/**
 * Bulk-create items (used by Excel import).
 * @param {object[]} items - Array of item data objects
 * @returns {object[]} Created items
 */
export async function bulkCreateItems(items) {
  const results = [];
  for (const data of items) {
    results.push(await createItem(data));
  }
  return results;
}

/**
 * Delete all items and activity logs (for Replace All import mode).
 */
export async function clearAllItems() {
  await db.items.clear();
  await db.activityLog.clear();
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

const VALID_PRIORITIES = new Set(['Do First', 'Plan Carefully', 'Do When Able', 'Reconsider']);

/**
 * Recalculate priority for any items that have missing or legacy (P1/P2/P3) values.
 * Called once on app startup.
 */
export async function migratePriorities() {
  const all = await db.items.toArray();
  for (const item of all) {
    if (!item.priority || !VALID_PRIORITIES.has(item.priority)) {
      const newPriority = calculatePriority(item.effortEstimate, item.riskLevel);
      if (newPriority) {
        await db.items.update(item.id, { priority: newPriority });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a camelCase field name to a readable label.
 */
function fieldLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
