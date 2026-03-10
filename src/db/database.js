/**
 * Supabase Database Layer for CloseOut
 * Provides all CRUD operations for items, activity logs, and settings.
 * Every query is scoped to the current user's organisation_id.
 */

import { supabase } from '../lib/supabase.js';
import { calculateRiskLevel, calculatePriority } from '../utils/riskMatrix.js';

// ---------------------------------------------------------------------------
// Date Helper — convert empty strings to null for Supabase date columns
// ---------------------------------------------------------------------------

function toDateOrNull(val) {
  if (!val || val === '' || val === 'null' || val === 'undefined') return null;
  return val;
}

// ---------------------------------------------------------------------------
// Field Mapping — camelCase ↔ snake_case
// ---------------------------------------------------------------------------

const ITEM_CAMEL_TO_SNAKE = {
  id: 'id',
  itemId: 'item_id',
  itemType: 'item_type',
  title: 'title',
  description: 'description',
  status: 'status',
  riskLevel: 'risk_level',
  likelihood: 'likelihood',
  consequence: 'consequence',
  priority: 'priority',
  effortEstimate: 'effort_estimate',
  effortHours: 'effort_hours',
  assignedTo: 'assigned_to',
  dueDate: 'due_date',
  department: 'department',
  location: 'location',
  correctiveAction: 'corrective_action',
  verificationPerson: 'verification_person',
  verificationDate: 'verification_date',
  approvalStatus: 'approval_status',
  approver: 'approver',
  closeOutDate: 'close_out_date',
  closeOutNote: 'close_out_note',
  raisedBy: 'raised_by',
  raisedDate: 'raised_date',
  source: 'source',
  tags: 'tags',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  isArchived: 'is_archived',
  organisationId: 'organisation_id',
};

const SETTINGS_CAMEL_TO_SNAKE = {
  id: 'id',
  projectName: 'project_name',
  departments: 'departments',
  locations: 'locations',
  teamMembers: 'team_members',
  defaultDueDateOffset: 'default_due_date_offset',
  dateFormat: 'date_format',
  language: 'language',
  onboardingComplete: 'onboarding_complete',
  organisationId: 'organisation_id',
};

const ACTIVITY_CAMEL_TO_SNAKE = {
  id: 'id',
  itemId: 'item_id',
  action: 'action',
  field: 'field',
  oldValue: 'old_value',
  newValue: 'new_value',
  timestamp: 'timestamp',
  organisationId: 'organisation_id',
};

// Build inverse maps
function invertMap(map) {
  const inv = {};
  for (const [k, v] of Object.entries(map)) {
    inv[v] = k;
  }
  return inv;
}

const ITEM_SNAKE_TO_CAMEL = invertMap(ITEM_CAMEL_TO_SNAKE);
const SETTINGS_SNAKE_TO_CAMEL = invertMap(SETTINGS_CAMEL_TO_SNAKE);
const ACTIVITY_SNAKE_TO_CAMEL = invertMap(ACTIVITY_CAMEL_TO_SNAKE);

/**
 * Convert a camelCase app object to a snake_case Supabase row.
 * Drops keys not present in the mapping and omits undefined values.
 */
function mapToSnake(obj, mapping = ITEM_CAMEL_TO_SNAKE) {
  const result = {};
  for (const [camel, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const snake = mapping[camel];
    if (snake) {
      result[snake] = value;
    }
  }
  return result;
}

/**
 * Convert a snake_case Supabase row to a camelCase app object.
 */
function mapToCamel(row, mapping = ITEM_SNAKE_TO_CAMEL) {
  if (!row) return null;
  const result = {};
  for (const [snake, value] of Object.entries(row)) {
    const camel = mapping[snake];
    if (camel) {
      result[camel] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Organisation ID Helper
// ---------------------------------------------------------------------------

let _cachedOrgId = null;

/**
 * Get the current user's organisation_id from the profiles table.
 * Caches the result so we only query once per session.
 */
export async function getOrgId() {
  if (_cachedOrgId) return _cachedOrgId;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('getOrgId: failed to get user', userError?.message);
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('getOrgId: failed to get organisation', error.message);
    throw new Error('Failed to get organisation: ' + error.message);
  }

  _cachedOrgId = data.organisation_id;
  return _cachedOrgId;
}

// Clear the cached org ID on sign-out
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    _cachedOrgId = null;
  }
});

// ---------------------------------------------------------------------------
// Default Settings
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS = {
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
  const orgId = await getOrgId();

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('organisation_id', orgId)
    .maybeSingle();

  if (error) {
    console.error('initializeSettings: query failed', error.message);
    throw new Error('initializeSettings failed: ' + error.message);
  }

  if (data) {
    return mapToCamel(data, SETTINGS_SNAKE_TO_CAMEL);
  }

  // No settings row exists — create one with defaults
  const defaults = mapToSnake(DEFAULT_SETTINGS, SETTINGS_CAMEL_TO_SNAKE);
  defaults.organisation_id = orgId;

  const { data: inserted, error: insertError } = await supabase
    .from('settings')
    .insert(defaults)
    .select()
    .single();

  if (insertError) {
    console.error('initializeSettings: insert failed', insertError.message);
    throw new Error('initializeSettings insert failed: ' + insertError.message);
  }

  return mapToCamel(inserted, SETTINGS_SNAKE_TO_CAMEL);
}

/**
 * Return current settings (singleton row for this org).
 */
export async function getSettings() {
  const orgId = await getOrgId();

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('organisation_id', orgId)
    .maybeSingle();

  if (error) {
    console.error('getSettings: query failed', error.message);
    throw new Error('getSettings failed: ' + error.message);
  }

  if (!data) return { ...DEFAULT_SETTINGS };
  return mapToCamel(data, SETTINGS_SNAKE_TO_CAMEL);
}

/**
 * Merge partial changes into settings.
 */
export async function updateSettings(changes) {
  const orgId = await getOrgId();
  const current = await getSettings();
  const merged = { ...current, ...changes };

  // Remove fields Supabase manages
  delete merged.id;
  delete merged.organisationId;

  const snakeData = mapToSnake(merged, SETTINGS_CAMEL_TO_SNAKE);
  snakeData.organisation_id = orgId;

  const { data, error } = await supabase
    .from('settings')
    .upsert(snakeData, { onConflict: 'organisation_id' })
    .select()
    .single();

  if (error) {
    console.error('updateSettings: upsert failed', error.message);
    throw new Error('updateSettings failed: ' + error.message);
  }

  return mapToCamel(data, SETTINGS_SNAKE_TO_CAMEL);
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
  const orgId = await getOrgId();
  const prefix = TYPE_PREFIX_MAP[itemType] || 'ITM';

  const { data, error } = await supabase
    .from('items')
    .select('item_id')
    .eq('organisation_id', orgId)
    .eq('item_type', itemType);

  if (error) {
    console.error('getNextItemId: query failed', error.message);
    throw new Error('getNextItemId failed: ' + error.message);
  }

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`);

  for (const row of data) {
    if (row.item_id) {
      const match = row.item_id.match(regex);
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

/**
 * Log an activity entry.
 * @param {string} itemUuid — the UUID primary key of the item
 * @param {string} action — human-readable description
 */
async function logActivity(itemUuid, action, field = '', oldValue = '', newValue = '') {
  const orgId = await getOrgId();

  const { error } = await supabase.from('activity_log').insert({
    item_id: itemUuid,
    action,
    field,
    old_value: String(oldValue ?? ''),
    new_value: String(newValue ?? ''),
    timestamp: new Date().toISOString(),
    organisation_id: orgId,
  });

  if (error) {
    // Activity logging failures should not break the main operation
    console.error('logActivity: insert failed', error.message);
  }
}

// ---------------------------------------------------------------------------
// Item CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new item. Auto-generates itemId if not provided, sets timestamps,
 * auto-calculates riskLevel from likelihood + consequence, and logs creation.
 * @param {object} data - Item fields
 * @returns {object} The created item (with UUID id)
 */
export async function createItem(data) {
  const orgId = await getOrgId();
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

  const snakeItem = mapToSnake(item);
  snakeItem.organisation_id = orgId;
  // Don't send id — Supabase generates the UUID
  delete snakeItem.id;

  // Convert empty date strings to null for Supabase date columns
  snakeItem.due_date = toDateOrNull(snakeItem.due_date);
  snakeItem.raised_date = toDateOrNull(snakeItem.raised_date);
  snakeItem.verification_date = toDateOrNull(snakeItem.verification_date);
  snakeItem.close_out_date = toDateOrNull(snakeItem.close_out_date);

  const { data: inserted, error } = await supabase
    .from('items')
    .insert(snakeItem)
    .select()
    .single();

  if (error) {
    console.error('createItem: insert failed', error.message);
    throw new Error('createItem failed: ' + error.message);
  }

  const result = mapToCamel(inserted);
  await logActivity(result.id, 'Item created');
  return result;
}

/**
 * Update an item. Diffs changed fields, logs each change, auto-recalculates
 * riskLevel when likelihood or consequence changes.
 * @param {string} id - UUID primary key
 * @param {object} changes - Partial field updates
 * @returns {object} Updated item
 */
export async function updateItem(id, changes) {
  const orgId = await getOrgId();

  // Fetch existing item
  const { data: existingRow, error: fetchError } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single();

  if (fetchError) {
    console.error('updateItem: fetch failed', fetchError.message);
    throw new Error(`Item with id ${id} not found`);
  }

  const existing = mapToCamel(existingRow);

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
  const updatedEffort =
    changes.effortEstimate !== undefined ? changes.effortEstimate : existing.effortEstimate;
  const updatedRisk =
    changes.riskLevel !== undefined ? changes.riskLevel : existing.riskLevel;
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
        existing.id,
        `${label} changed from "${oldVal ?? ''}" to "${newVal ?? ''}"`,
        key,
        oldVal,
        newVal
      );
    }
  }

  // Convert changes to snake_case and update
  const snakeChanges = mapToSnake(changes);

  // Convert empty date strings to null for Supabase date columns
  if ('due_date' in snakeChanges) snakeChanges.due_date = toDateOrNull(snakeChanges.due_date);
  if ('raised_date' in snakeChanges) snakeChanges.raised_date = toDateOrNull(snakeChanges.raised_date);
  if ('verification_date' in snakeChanges) snakeChanges.verification_date = toDateOrNull(snakeChanges.verification_date);
  if ('close_out_date' in snakeChanges) snakeChanges.close_out_date = toDateOrNull(snakeChanges.close_out_date);

  const { data: updatedRow, error: updateError } = await supabase
    .from('items')
    .update(snakeChanges)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .select()
    .single();

  if (updateError) {
    console.error('updateItem: update failed', updateError.message);
    throw new Error('updateItem failed: ' + updateError.message);
  }

  return mapToCamel(updatedRow);
}

/**
 * Archive an item (soft delete).
 */
export async function archiveItem(id) {
  const orgId = await getOrgId();

  // Fetch to get the user-facing itemId for the activity log
  const { data: row, error: fetchError } = await supabase
    .from('items')
    .select('item_id')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single();

  if (fetchError) {
    console.error('archiveItem: fetch failed', fetchError.message);
    throw new Error(`Item with id ${id} not found`);
  }

  const { error } = await supabase
    .from('items')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId);

  if (error) {
    console.error('archiveItem: update failed', error.message);
    throw new Error('archiveItem failed: ' + error.message);
  }

  await logActivity(id, 'Item archived');
}

/**
 * Restore an archived item.
 */
export async function restoreItem(id) {
  const orgId = await getOrgId();

  const { data: row, error: fetchError } = await supabase
    .from('items')
    .select('item_id')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single();

  if (fetchError) {
    console.error('restoreItem: fetch failed', fetchError.message);
    throw new Error(`Item with id ${id} not found`);
  }

  const { error } = await supabase
    .from('items')
    .update({ is_archived: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId);

  if (error) {
    console.error('restoreItem: update failed', error.message);
    throw new Error('restoreItem failed: ' + error.message);
  }

  await logActivity(id, 'Item restored from archive');
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
 * @param {string[]} ids - Array of UUID primary keys
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
 * @param {string[]} ids - Array of UUID primary keys
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
  const orgId = await getOrgId();

  const { data: row, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single();

  if (error) {
    console.error('duplicateItem: fetch failed', error.message);
    throw new Error(`Item with id ${id} not found`);
  }

  const original = mapToCamel(row);
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
  const orgId = await getOrgId();

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('organisation_id', orgId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAllItems: query failed', error.message);
    throw new Error('getAllItems failed: ' + error.message);
  }

  return data.map((row) => mapToCamel(row));
}

/**
 * Return all archived items.
 */
export async function getArchivedItems() {
  const orgId = await getOrgId();

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('organisation_id', orgId)
    .eq('is_archived', true)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('getArchivedItems: query failed', error.message);
    throw new Error('getArchivedItems failed: ' + error.message);
  }

  return data.map((row) => mapToCamel(row));
}

/**
 * Get a single item by its user-facing itemId string (e.g. "ACT-001").
 * Returns the item or undefined if not found.
 */
export async function getItemByItemId(itemId) {
  const orgId = await getOrgId();

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('organisation_id', orgId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) {
    console.error('getItemByItemId: query failed', error.message);
    throw new Error('getItemByItemId failed: ' + error.message);
  }

  return data ? mapToCamel(data) : undefined;
}

/**
 * Get activity log entries for an item, newest first.
 * Accepts the user-facing itemId string (e.g. "ACT-001") since that is
 * what components pass in. Looks up the UUID internally to query the log.
 */
export async function getActivityLog(itemId) {
  const orgId = await getOrgId();

  // Resolve user-facing itemId (e.g. "ACT-001") to the UUID primary key
  const { data: item, error: lookupError } = await supabase
    .from('items')
    .select('id')
    .eq('organisation_id', orgId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (lookupError) {
    console.error('getActivityLog: item lookup failed', lookupError.message);
    throw new Error('getActivityLog lookup failed: ' + lookupError.message);
  }

  if (!item) return [];

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('organisation_id', orgId)
    .eq('item_id', item.id)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('getActivityLog: query failed', error.message);
    throw new Error('getActivityLog failed: ' + error.message);
  }

  return data.map((row) => mapToCamel(row, ACTIVITY_SNAKE_TO_CAMEL));
}

/**
 * Return items that are overdue (status not Closed/Cancelled, dueDate < today).
 */
export async function getOverdueItems() {
  const orgId = await getOrgId();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('organisation_id', orgId)
    .eq('is_archived', false);

  if (error) {
    console.error('getOverdueItems: query failed', error.message);
    throw new Error('getOverdueItems failed: ' + error.message);
  }

  return data
    .filter(
      (row) =>
        row.due_date &&
        row.due_date < today &&
        row.status !== 'Closed' &&
        row.status !== 'Cancelled'
    )
    .map((row) => mapToCamel(row));
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
 * Delete all items and activity logs for this org (for Replace All import mode).
 */
export async function clearAllItems() {
  const orgId = await getOrgId();

  // Delete activity logs first
  const { error: logError } = await supabase
    .from('activity_log')
    .delete()
    .eq('organisation_id', orgId);

  if (logError) {
    console.error('clearAllItems: activity_log delete failed', logError.message);
    throw new Error('clearAllItems failed: ' + logError.message);
  }

  const { error: itemError } = await supabase
    .from('items')
    .delete()
    .eq('organisation_id', orgId);

  if (itemError) {
    console.error('clearAllItems: items delete failed', itemError.message);
    throw new Error('clearAllItems failed: ' + itemError.message);
  }
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
  const orgId = await getOrgId();

  const { data, error } = await supabase
    .from('items')
    .select('id, effort_estimate, risk_level, priority')
    .eq('organisation_id', orgId);

  if (error) {
    console.error('migratePriorities: query failed', error.message);
    return; // Non-fatal — don't block app startup
  }

  for (const row of data) {
    if (!row.priority || !VALID_PRIORITIES.has(row.priority)) {
      const newPriority = calculatePriority(row.effort_estimate, row.risk_level);
      if (newPriority) {
        await supabase
          .from('items')
          .update({ priority: newPriority })
          .eq('id', row.id)
          .eq('organisation_id', orgId);
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
