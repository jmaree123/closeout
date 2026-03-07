/**
 * Zustand store for CloseOut UI state.
 * Controls panels, modals, and view tracking.
 */

import { create } from 'zustand';

const useUiStore = create((set) => ({
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  detailPanelOpen: false,
  detailPanelItemId: null,
  quickAddOpen: false,
  importWizardOpen: false,
  activeView: 'dashboard', // Used for header title display, not routing

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  /** Open the detail panel for a specific item. */
  openDetailPanel: (itemId) =>
    set({ detailPanelOpen: true, detailPanelItemId: itemId }),

  /** Close the detail panel. */
  closeDetailPanel: () =>
    set({ detailPanelOpen: false, detailPanelItemId: null }),

  /** Open the quick add modal/form. */
  openQuickAdd: () => set({ quickAddOpen: true }),

  /** Close the quick add modal/form. */
  closeQuickAdd: () => set({ quickAddOpen: false }),

  /** Open the import wizard. */
  openImportWizard: () => set({ importWizardOpen: true }),

  /** Close the import wizard. */
  closeImportWizard: () => set({ importWizardOpen: false }),

  /** Set the active view for header title display. */
  setActiveView: (view) => set({ activeView: view }),
}));

export default useUiStore;
