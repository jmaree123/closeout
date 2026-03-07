/**
 * BulkActions — floating action bar at bottom of screen when rows are selected.
 * Actions: Change Status, Reassign, Export Selected, Archive.
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import { STATUS_OPTIONS } from '../../utils/riskMatrix.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateStatus } from '../../utils/displayLabels.js';
import Modal from '../ui/Modal.jsx';

export default function BulkActions() {
  const selectedIds = useItemStore((s) => s.selectedIds);
  const items = useItemStore((s) => s.items);
  const clearSelection = useItemStore((s) => s.clearSelection);
  const bulkUpdateStatus = useItemStore((s) => s.bulkUpdateStatus);
  const bulkAssign = useItemStore((s) => s.bulkAssign);
  const removeItem = useItemStore((s) => s.removeItem);

  const { t, lang } = useTranslation();

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const count = selectedIds.size;
  if (count === 0) return null;

  // Unique assignees from current items for reassign dropdown
  const assignees = [...new Set(items.map((i) => i.assignedTo).filter(Boolean))].sort();

  const handleStatusChange = async (e) => {
    const status = e.target.value;
    if (!status) return;
    await bulkUpdateStatus(status);
  };

  const handleReassign = async (e) => {
    const person = e.target.value;
    if (!person) return;
    await bulkAssign(person);
  };

  const handleArchive = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await removeItem(id);
    }
    setShowArchiveConfirm(false);
  };

  const handleExport = () => {
    console.log('Export selected items:', Array.from(selectedIds));
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-boronia-navy text-white rounded-lg shadow-xl px-6 py-3 flex items-center gap-4 animate-slide-up">
        {/* Count */}
        <span className="text-sm font-medium whitespace-nowrap">
          {count} {t('register_items')} {t('register_selected')}
        </span>

        <div className="w-px h-5 bg-white/20" />

        {/* Change Status */}
        <select
          onChange={handleStatusChange}
          defaultValue=""
          className="bg-white/10 border border-white/20 text-white text-sm rounded-md px-2.5 py-1.5 cursor-pointer appearance-none hover:bg-white/20"
        >
          <option value="" className="text-gray-800">{t('bulk_change_status')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="text-gray-800">{translateStatus(s, lang)}</option>
          ))}
        </select>

        {/* Reassign */}
        <select
          onChange={handleReassign}
          defaultValue=""
          className="bg-white/10 border border-white/20 text-white text-sm rounded-md px-2.5 py-1.5 cursor-pointer appearance-none hover:bg-white/20"
        >
          <option value="" className="text-gray-800">{t('bulk_reassign')}</option>
          {assignees.map((a) => (
            <option key={a} value={a} className="text-gray-800">{a}</option>
          ))}
        </select>

        {/* Export */}
        <button
          onClick={handleExport}
          className="text-sm font-medium px-3 py-1.5 bg-white/10 border border-white/20 rounded-md hover:bg-white/20 transition-colors"
        >
          {t('bulk_export_selected')}
        </button>

        {/* Archive */}
        <button
          onClick={() => setShowArchiveConfirm(true)}
          className="text-sm font-medium px-3 py-1.5 bg-red-500/20 border border-red-400/30 text-red-300 rounded-md hover:bg-red-500/30 transition-colors"
        >
          {t('bulk_archive')}
        </button>

        <div className="w-px h-5 bg-white/20" />

        {/* Clear */}
        <button
          onClick={clearSelection}
          className="text-white/70 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Archive confirmation modal */}
      <Modal
        open={showArchiveConfirm}
        title={t('bulk_archive_title')}
        message={`${t('bulk_archive_confirm_start')} ${count} ${t('register_items')}? ${t('bulk_archive_confirm_end')}`}
        confirmLabel={t('btn_archive')}
        cancelLabel={t('btn_cancel')}
        destructive
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </>
  );
}
