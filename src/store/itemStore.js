/**
 * Zustand store for CloseOut items.
 * Manages items state, filtering, sorting, selection, and computed aggregations.
 */

import { create } from 'zustand';
import {
  getAllItems,
  createItem,
  updateItem as dbUpdateItem,
  archiveItem,
  changeStatus as dbChangeStatus,
  bulkUpdateStatus as dbBulkUpdateStatus,
  bulkAssign as dbBulkAssign,
} from '../db/database.js';
import { isOverdue } from '../utils/dateUtils.js';

const useItemStore = create((set, get) => ({
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  items: [],
  selectedIds: new Set(),
  searchQuery: '',
  filters: {
    status: null,
    riskLevel: null,
    department: null,
    location: null,
    assignedTo: null,
    itemType: null,
  },
  sortConfig: { key: 'createdAt', direction: 'desc' },

  // -----------------------------------------------------------------------
  // Actions — data
  // -----------------------------------------------------------------------

  /** Load all non-archived items from Dexie into state. */
  loadItems: async () => {
    const items = await getAllItems();
    set({ items });
  },

  /** Create a new item and refresh the list. */
  addItem: async (data) => {
    const item = await createItem(data);
    await get().loadItems();
    return item;
  },

  /** Update an existing item and refresh the list. */
  updateItem: async (id, changes) => {
    const updated = await dbUpdateItem(id, changes);
    await get().loadItems();
    return updated;
  },

  /** Archive (soft-delete) an item and refresh. */
  removeItem: async (id) => {
    await archiveItem(id);
    // Remove from selection if selected
    const selectedIds = new Set(get().selectedIds);
    selectedIds.delete(id);
    set({ selectedIds });
    await get().loadItems();
  },

  // -----------------------------------------------------------------------
  // Actions — search, filter, sort
  // -----------------------------------------------------------------------

  setSearch: (query) => set({ searchQuery: query }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  clearFilters: () =>
    set({
      filters: {
        status: null,
        riskLevel: null,
        department: null,
        location: null,
        assignedTo: null,
        itemType: null,
      },
      searchQuery: '',
    }),

  setSort: (key, direction) => set({ sortConfig: { key, direction } }),

  // -----------------------------------------------------------------------
  // Actions — selection
  // -----------------------------------------------------------------------

  toggleSelect: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),

  clearSelection: () => set({ selectedIds: new Set() }),

  // -----------------------------------------------------------------------
  // Actions — bulk operations
  // -----------------------------------------------------------------------

  bulkUpdateStatus: async (newStatus) => {
    const ids = Array.from(get().selectedIds);
    if (ids.length === 0) return;
    await dbBulkUpdateStatus(ids, newStatus);
    set({ selectedIds: new Set() });
    await get().loadItems();
  },

  bulkAssign: async (assignedTo) => {
    const ids = Array.from(get().selectedIds);
    if (ids.length === 0) return;
    await dbBulkAssign(ids, assignedTo);
    set({ selectedIds: new Set() });
    await get().loadItems();
  },

  // -----------------------------------------------------------------------
  // Computed / Getters
  // -----------------------------------------------------------------------

  /** Apply search query + all active filters + sort to the items array. */
  getFilteredItems: () => {
    const { items, searchQuery, filters, sortConfig } = get();
    let result = [...items];

    // Text search across multiple fields
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const searchable = [
          item.itemId,
          item.title,
          item.description,
          item.assignedTo,
          item.department,
          item.location,
          item.status,
          item.riskLevel,
          item.correctiveAction,
          item.tags,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchable.includes(q);
      });
    }

    // Apply each filter
    if (filters.status) {
      result = result.filter((i) => i.status === filters.status);
    }
    if (filters.riskLevel) {
      result = result.filter((i) => i.riskLevel === filters.riskLevel);
    }
    if (filters.department) {
      result = result.filter((i) => i.department === filters.department);
    }
    if (filters.location) {
      result = result.filter((i) => i.location === filters.location);
    }
    if (filters.assignedTo) {
      result = result.filter((i) => i.assignedTo === filters.assignedTo);
    }
    if (filters.itemType) {
      result = result.filter((i) => i.itemType === filters.itemType);
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key] ?? '';
        let bVal = b[sortConfig.key] ?? '';

        // Numeric comparison for effort hours
        if (sortConfig.key === 'effortHours') {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // String comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  },

  /** Return overdue items (open/in-progress items past due date). */
  getOverdueItems: () => {
    const { items } = get();
    return items.filter((i) => isOverdue(i.dueDate, i.status));
  },

  /** Group items by assignedTo. */
  getItemsByPerson: () => {
    const { items } = get();
    const grouped = {};
    for (const item of items) {
      const person = item.assignedTo || 'Unassigned';
      if (!grouped[person]) grouped[person] = [];
      grouped[person].push(item);
    }
    return grouped;
  },

  /** Group items by department. */
  getItemsByDepartment: () => {
    const { items } = get();
    const grouped = {};
    for (const item of items) {
      const dept = item.department || 'Unassigned';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(item);
    }
    return grouped;
  },

  /** Group items by location. */
  getItemsByLocation: () => {
    const { items } = get();
    const grouped = {};
    for (const item of items) {
      const loc = item.location || 'Unspecified';
      if (!grouped[loc]) grouped[loc] = [];
      grouped[loc].push(item);
    }
    return grouped;
  },

  /** Count of open items (Open + In Progress + Pending Verification). */
  getOpenCount: () => {
    const { items } = get();
    return items.filter(
      (i) => i.status === 'Open' || i.status === 'In Progress' || i.status === 'Pending Verification'
    ).length;
  },

  /** Count of overdue items. */
  getOverdueCount: () => {
    return get().getOverdueItems().length;
  },

  /** Count of items closed this calendar month. */
  getClosedThisMonthCount: () => {
    const { items } = get();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    return items.filter((i) => {
      if (i.status !== 'Closed' || !i.closeOutDate) return false;
      const d = new Date(i.closeOutDate);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;
  },

  /** Average days to close for closed items (from raisedDate to closeOutDate). */
  getAverageDaysToClose: () => {
    const { items } = get();
    const closedItems = items.filter(
      (i) => i.status === 'Closed' && i.raisedDate && i.closeOutDate
    );

    if (closedItems.length === 0) return 0;

    let totalDays = 0;
    for (const item of closedItems) {
      const raised = new Date(item.raisedDate);
      const closed = new Date(item.closeOutDate);
      const diffMs = closed - raised;
      totalDays += Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return Math.round(totalDays / closedItems.length);
  },
}));

export default useItemStore;
