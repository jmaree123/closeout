/**
 * Header — fixed top bar to the right of the sidebar.
 * Shows current view name and action buttons (Add Item, Import, Export).
 */

import { useLocation } from 'react-router-dom';
import { Plus, Upload, Download, LogOut } from 'lucide-react';
import useUiStore from '../../store/uiStore.js';
import useItemStore from '../../store/itemStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { exportFilteredView } from '../../utils/excelExporter.js';
import { useTranslation } from '../../hooks/useTranslation.js';

const ROUTE_NAME_KEYS = {
  '/dashboard': 'nav_dashboard',
  '/register': 'nav_register',
  '/risk-matrix': 'nav_risk_matrix',
  '/scatter': 'nav_scatter',
  '/kanban': 'nav_kanban',
  '/by-person': 'nav_by_person',
  '/by-department': 'nav_by_department',
  '/by-location': 'nav_by_location',
  '/reports': 'nav_reports',
  '/settings': 'nav_settings',
};

export default function Header({ sidebarCollapsed, onLogout }) {
  const { pathname } = useLocation();
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const openImportWizard = useUiStore((s) => s.openImportWizard);
  const getFilteredItems = useItemStore((s) => s.getFilteredItems);
  const filters = useItemStore((s) => s.filters);
  const settings = useSettingsStore((s) => s.settings);
  const { t } = useTranslation();

  const nameKey = ROUTE_NAME_KEYS[pathname];
  const viewName = nameKey ? t(nameKey) : 'CloseOut';

  const handleExport = async () => {
    const items = getFilteredItems();
    await exportFilteredView(items, settings || {}, filters);
  };

  return (
    <header
      className={`fixed top-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30 transition-all duration-200 ${
        sidebarCollapsed ? 'left-16' : 'left-60'
      }`}
    >
      {/* Left: View name */}
      <h1 className="text-lg font-semibold text-boronia-navy tracking-tight">
        {viewName}
      </h1>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={openQuickAdd}
          className="inline-flex items-center gap-1.5 bg-boronia-coral hover:bg-boronia-coral-light text-white text-sm font-medium rounded-md px-4 py-2 transition-colors"
        >
          <Plus size={16} />
          {t('btn_add_item')}
        </button>
        <button
          onClick={openImportWizard}
          className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-md px-4 py-2 transition-colors"
        >
          <Upload size={16} />
          {t('btn_import')}
        </button>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-md px-4 py-2 transition-colors"
        >
          <Download size={16} />
          {t('btn_export')}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-red-600 text-sm font-medium rounded-md px-3 py-2 transition-colors"
          title="Sign Out"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
