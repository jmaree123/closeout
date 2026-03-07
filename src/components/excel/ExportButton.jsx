/**
 * ExportButton — dropdown with export options.
 * "Export Current View" exports filtered items.
 * "Export Template" exports a blank template with headers.
 */

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileDown } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { exportFilteredView, exportTemplate } from '../../utils/excelExporter.js';
import { useTranslation } from '../../hooks/useTranslation.js';

export default function ExportButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { t } = useTranslation();

  const getFilteredItems = useItemStore((s) => s.getFilteredItems);
  const filters = useItemStore((s) => s.filters);
  const settings = useSettingsStore((s) => s.settings);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleExportView = async () => {
    const items = getFilteredItems();
    await exportFilteredView(items, settings || {}, filters);
    setOpen(false);
  };

  const handleExportTemplate = async () => {
    await exportTemplate(settings || {});
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-md px-4 py-2 transition-colors"
      >
        <Download size={16} />
        {t('btn_export')}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          <button
            onClick={handleExportView}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <FileSpreadsheet size={16} className="text-gray-400" />
            {t('export_current_view')}
          </button>
          <button
            onClick={handleExportTemplate}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <FileDown size={16} className="text-gray-400" />
            {t('export_template')}
          </button>
        </div>
      )}
    </div>
  );
}
