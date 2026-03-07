/**
 * ItemPanel — slide-out detail panel from the right side.
 * Width: 560px on desktop. Overlays main content with semi-transparent backdrop.
 * Controlled by uiStore: opens when detailPanelOpen is true.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, FileDown, Archive, Check } from 'lucide-react';
import useUiStore from '../../store/uiStore.js';
import useItemStore from '../../store/itemStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { duplicateItem } from '../../db/database.js';
import { getDaysOverdue } from '../../utils/dateUtils.js';
import { TYPE_COLORS, STATUS_OPTIONS } from '../../utils/riskMatrix.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateStatus } from '../../utils/displayLabels.js';
import Badge from '../ui/Badge.jsx';
import Modal from '../ui/Modal.jsx';
import ItemForm from './ItemForm.jsx';

// ---------------------------------------------------------------------------
// Debounce helper
// ---------------------------------------------------------------------------

function useDebouncedSave(updateFn, delay = 500) {
  const timerRef = useRef(null);
  const pendingRef = useRef({});

  const save = useCallback(
    (id, field, value) => {
      pendingRef.current[field] = value;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        const changes = { ...pendingRef.current };
        pendingRef.current = {};
        try {
          await updateFn(id, changes);
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }, delay);
    },
    [updateFn, delay]
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return save;
}

// ---------------------------------------------------------------------------
// Saved indicator
// ---------------------------------------------------------------------------

function SavedIndicator({ visible, label }) {
  if (!visible) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 animate-pulse">
      <Check size={12} /> {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ItemPanel() {
  const { detailPanelOpen, detailPanelItemId, closeDetailPanel } = useUiStore();
  const { items, updateItem, removeItem, loadItems } = useItemStore();
  const { settings } = useSettingsStore();

  const { t, lang } = useTranslation();

  const [localItem, setLocalItem] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [archiveModal, setArchiveModal] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const savedTimerRef = useRef(null);

  // Find the item from the store
  const item = items.find((i) => i.id === detailPanelItemId);

  // Sync local state when item changes
  useEffect(() => {
    if (item) {
      setLocalItem({ ...item });
      setTitleValue(item.title || '');
    } else {
      setLocalItem(null);
    }
  }, [item?.id, item?.updatedAt]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!detailPanelOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') closeDetailPanel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [detailPanelOpen, closeDetailPanel]);

  // Debounced save
  const debouncedSave = useDebouncedSave(updateItem);

  const flashSaved = useCallback(() => {
    setShowSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setShowSaved(false), 1500);
  }, []);

  // Handle field change — update local state immediately, debounce save
  const handleFieldChange = useCallback(
    (field, value) => {
      if (!localItem) return;

      setLocalItem((prev) => ({ ...prev, [field]: value }));
      debouncedSave(localItem.id, field, value);
      flashSaved();
    },
    [localItem?.id, debouncedSave, flashSaved]
  );

  // Handle inline title save
  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (titleValue !== item?.title) {
      handleFieldChange('title', titleValue);
    }
  };

  // Handle status change (inline dropdown)
  const handleStatusChange = (newStatus) => {
    handleFieldChange('status', newStatus);
    if (newStatus === 'Closed') {
      handleFieldChange('closeOutDate', new Date().toISOString().split('T')[0]);
    }
    if (newStatus === 'Open' && (item?.status === 'Closed' || item?.status === 'Cancelled')) {
      handleFieldChange('closeOutDate', '');
    }
  };

  // Duplicate
  const handleDuplicate = async () => {
    if (!item) return;
    setDuplicating(true);
    try {
      await duplicateItem(item.id);
      await loadItems();
    } catch (err) {
      console.error('Duplicate failed:', err);
    } finally {
      setDuplicating(false);
    }
  };

  // Archive
  const handleArchive = async () => {
    if (!item) return;
    setArchiveModal(false);
    try {
      await removeItem(item.id);
      closeDetailPanel();
    } catch (err) {
      console.error('Archive failed:', err);
    }
  };

  // Export PDF (placeholder — will call pdfExport.js)
  const handleExportPdf = async () => {
    if (!localItem) return;
    try {
      const { generateItemPdf } = await import('../../utils/pdfExport.js');
      await generateItemPdf(localItem, settings);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  // Computed: overdue info
  const daysOverdue = localItem ? getDaysOverdue(localItem.dueDate, localItem.status) : 0;
  const isItemOverdue = daysOverdue > 0;

  if (!detailPanelOpen) return null;

  const typeColor = localItem ? TYPE_COLORS[localItem.itemType] || '#9CA3AF' : '#9CA3AF';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity"
        onClick={closeDetailPanel}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 h-full w-full max-w-[560px] bg-white shadow-2xl flex flex-col
                   transform transition-transform duration-250 ease-out"
        style={{ willChange: 'transform' }}
      >
        {/* ---- HEADER ---- */}
        <div className="flex-shrink-0 border-b border-gray-200 px-5 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              {/* Item ID + Type badges */}
              <div className="flex items-center gap-2 mb-2">
                {localItem && (
                  <>
                    <span
                      className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: typeColor }}
                    >
                      {localItem.itemId}
                    </span>
                    <Badge variant="type" value={localItem.itemType} />
                    <SavedIndicator visible={showSaved} label={t('panel_saved')} />
                  </>
                )}
              </div>

              {/* Title — editable inline */}
              {editingTitle ? (
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleBlur();
                    if (e.key === 'Escape') {
                      setTitleValue(item?.title || '');
                      setEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="w-full text-lg font-semibold text-boronia-navy border border-gray-300 rounded-md px-2 py-1
                             focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral"
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  className="text-lg font-semibold text-boronia-navy cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 -mx-1 truncate"
                  title="Click to edit title"
                >
                  {localItem?.title || t('panel_untitled')}
                </h2>
              )}

              {/* Status dropdown */}
              {localItem && (
                <div className="mt-2">
                  <select
                    value={localItem.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="border border-gray-300 rounded-md text-sm py-1 px-2 bg-white
                               focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {translateStatus(s, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={closeDetailPanel}
              className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close panel"
            >
              <X size={20} />
            </button>
          </div>

          {/* Overdue banner */}
          {isItemOverdue && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700 font-medium">
              {t('panel_overdue_banner')} — {daysOverdue} {t('panel_days_past_due')}
            </div>
          )}
        </div>

        {/* ---- BODY (scrollable) ---- */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {localItem ? (
            <ItemForm
              item={localItem}
              onFieldChange={handleFieldChange}
              settings={settings}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">{t('panel_item_not_found')}</p>
            </div>
          )}
        </div>

        {/* ---- FOOTER ---- */}
        {localItem && (
          <div className="flex-shrink-0 border-t border-gray-200 px-5 py-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={duplicating}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50
                         rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60"
            >
              <Copy size={14} />
              {duplicating ? t('panel_duplicating') : t('btn_duplicate')}
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50
                         rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <FileDown size={14} />
              {t('panel_export_pdf')}
            </button>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => setArchiveModal(true)}
              className="inline-flex items-center gap-1.5 bg-white border border-red-300 text-red-600 hover:bg-red-50
                         rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <Archive size={14} />
              {t('btn_archive')}
            </button>
          </div>
        )}
      </div>

      {/* Archive confirmation modal */}
      <Modal
        open={archiveModal}
        title={t('btn_archive')}
        message={t('panel_archive_confirm')}
        confirmLabel={t('btn_archive')}
        cancelLabel={t('btn_cancel')}
        onConfirm={handleArchive}
        onCancel={() => setArchiveModal(false)}
        destructive
      />
    </>
  );
}
