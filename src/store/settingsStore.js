/**
 * Zustand store for CloseOut project settings.
 * Manages project configuration, departments, locations, and team members.
 */

import { create } from 'zustand';
import {
  initializeSettings,
  getSettings,
  updateSettings as dbUpdateSettings,
} from '../db/database.js';

const useSettingsStore = create((set, get) => ({
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  settings: null,

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  /** Load settings from the database, initialising defaults if needed. */
  loadSettings: async () => {
    const settings = await initializeSettings();
    set({ settings });
    return settings;
  },

  /** Merge partial changes into settings and persist. */
  updateSettings: async (changes) => {
    const updated = await dbUpdateSettings(changes);
    set({ settings: updated });
    return updated;
  },

  /** Add a department to the list. */
  addDepartment: async (name) => {
    const { settings } = get();
    if (!settings) return;
    const departments = [...(settings.departments || [])];
    const trimmed = name.trim();
    if (!trimmed || departments.includes(trimmed)) return;
    departments.push(trimmed);
    await get().updateSettings({ departments });
  },

  /** Remove a department from the list. */
  removeDepartment: async (name) => {
    const { settings } = get();
    if (!settings) return;
    const departments = (settings.departments || []).filter((d) => d !== name);
    await get().updateSettings({ departments });
  },

  /** Add a location to the list. */
  addLocation: async (name) => {
    const { settings } = get();
    if (!settings) return;
    const locations = [...(settings.locations || [])];
    const trimmed = name.trim();
    if (!trimmed || locations.includes(trimmed)) return;
    locations.push(trimmed);
    await get().updateSettings({ locations });
  },

  /** Remove a location from the list. */
  removeLocation: async (name) => {
    const { settings } = get();
    if (!settings) return;
    const locations = (settings.locations || []).filter((l) => l !== name);
    await get().updateSettings({ locations });
  },

  /** Add a team member to the list. */
  addTeamMember: async (name) => {
    const { settings } = get();
    if (!settings) return;
    const teamMembers = [...(settings.teamMembers || [])];
    const trimmed = name.trim();
    if (!trimmed || teamMembers.includes(trimmed)) return;
    teamMembers.push(trimmed);
    await get().updateSettings({ teamMembers });
  },

  /** Remove a team member from the list. */
  removeTeamMember: async (name) => {
    const { settings } = get();
    if (!settings) return;
    const teamMembers = (settings.teamMembers || []).filter((m) => m !== name);
    await get().updateSettings({ teamMembers });
  },
}));

export default useSettingsStore;
