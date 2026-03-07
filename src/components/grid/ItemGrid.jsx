/**
 * ItemGrid — main data grid using @tanstack/react-table v8 with @tanstack/react-virtual.
 * Features: virtual scrolling, sorting, inline status editing, multi-select, row styling.
 */

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plus, Upload, Download, ChevronUp, ChevronDown } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUiStore from '../../store/uiStore.js';
import { STATUS_OPTIONS } from '../../utils/riskMatrix.js';
import { isOverdue, getDaysUntilDue, formatDate } from '../../utils/dateUtils.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateStatus, translateRiskLevel } from '../../utils/displayLabels.js';
import Badge from '../ui/Badge.jsx';
import FilterBar from './FilterBar.jsx';
import BulkActions from './BulkActions.jsx';
import QuickAdd from './QuickAdd.jsx';

const ROW_HEIGHT = 48;

/** Inline status editor dropdown */
function StatusCell({ item, onStatusChange, lang }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!editing) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editing]);

  if (editing) {
    return (
      <div ref={ref} className="relative">
        <select
          autoFocus
          value={item.status}
          onChange={(e) => {
            onStatusChange(item.id, e.target.value);
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          className="border border-boronia-coral rounded text-xs py-0.5 pl-2 pr-6 bg-white appearance-none focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{translateStatus(s, lang)}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className="cursor-pointer"
    >
      <Badge variant="status" value={item.status} />
    </button>
  );
}

export default function ItemGrid() {
  const getFilteredItems = useItemStore((s) => s.getFilteredItems);
  const items = useItemStore((s) => s.items);
  const searchQuery = useItemStore((s) => s.searchQuery);
  const filters = useItemStore((s) => s.filters);
  const sortConfig = useItemStore((s) => s.sortConfig);
  const selectedIds = useItemStore((s) => s.selectedIds);
  const toggleSelect = useItemStore((s) => s.toggleSelect);
  const selectAll = useItemStore((s) => s.selectAll);
  const clearSelection = useItemStore((s) => s.clearSelection);
  const updateItem = useItemStore((s) => s.updateItem);
  const loadItems = useItemStore((s) => s.loadItems);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const openImportWizard = useUiStore((s) => s.openImportWizard);
  const settings = useSettingsStore((s) => s.settings);

  const { t, lang } = useTranslation();

  const [sorting, setSorting] = useState([]);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    loadItems();
    loadSettings();
  }, [loadItems, loadSettings]);

  const data = useMemo(() => getFilteredItems(), [items, searchQuery, filters, sortConfig, getFilteredItems]);

  const handleStatusChange = useCallback(
    async (id, newStatus) => {
      const changes = { status: newStatus };
      if (newStatus === 'Closed') {
        changes.closeOutDate = new Date().toISOString().split('T')[0];
      }
      await updateItem(id, changes);
    },
    [updateItem]
  );

  const allSelected =
    data.length > 0 && data.every((item) => selectedIds.has(item.id));

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(data.map((i) => i.id));
    }
  };

  const dateFormat = settings?.dateFormat || 'DD/MM/YYYY';

  const columns = useMemo(
    () => [
      {
        id: 'select',
        size: 40,
        header: () => (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            className="rounded border-gray-300 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleSelect(row.original.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300 cursor-pointer"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'itemId',
        header: t('field_item_id'),
        size: 100,
        cell: ({ row }) => (
          <Badge variant="type" value={row.original.itemId} />
        ),
      },
      {
        accessorKey: 'title',
        header: t('field_title'),
        size: 280,
        cell: ({ getValue }) => (
          <span className="text-[13px] font-medium text-gray-800 truncate block">
            {getValue() || 'Untitled'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('field_status'),
        size: 150,
        cell: ({ row }) => (
          <StatusCell
            item={row.original}
            onStatusChange={handleStatusChange}
            lang={lang}
          />
        ),
      },
      {
        accessorKey: 'riskLevel',
        header: t('field_risk'),
        size: 100,
        cell: ({ getValue }) => <Badge variant="risk" value={getValue()} />,
      },
      {
        accessorKey: 'assignedTo',
        header: t('field_assigned_to'),
        size: 140,
        cell: ({ getValue }) => (
          <span className="text-[13px] text-gray-600 truncate block">
            {getValue() || '--'}
          </span>
        ),
      },
      {
        accessorKey: 'department',
        header: t('field_department'),
        size: 130,
        cell: ({ getValue }) => (
          <span className="text-[13px] text-gray-600 truncate block">
            {getValue() || '--'}
          </span>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: t('field_due_date'),
        size: 110,
        cell: ({ row }) => {
          const item = row.original;
          const overdue = isOverdue(item.dueDate, item.status);
          const daysUntil = getDaysUntilDue(item.dueDate);
          const isNearDue = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && item.status !== 'Closed' && item.status !== 'Cancelled';

          return (
            <span
              className={`text-[13px] font-medium ${
                overdue
                  ? 'text-red-600'
                  : isNearDue
                  ? 'text-amber-600'
                  : 'text-gray-600'
              }`}
            >
              {formatDate(item.dueDate, dateFormat) || '--'}
            </span>
          );
        },
      },
      {
        accessorKey: 'itemType',
        header: t('field_item_type'),
        size: 120,
        cell: ({ getValue }) => <Badge variant="type" value={getValue()} />,
      },
      {
        accessorKey: 'priority',
        header: t('field_priority'),
        size: 80,
        cell: ({ getValue }) => {
          const v = getValue();
          return v ? <Badge variant="priority" value={v} /> : <span className="text-gray-300">--</span>;
        },
      },
      {
        accessorKey: 'location',
        header: t('field_location'),
        size: 120,
        cell: ({ getValue }) => (
          <span className="text-[13px] text-gray-600 truncate block">
            {getValue() || '--'}
          </span>
        ),
      },
    ],
    [allSelected, selectedIds, handleStatusChange, dateFormat, handleSelectAll, toggleSelect, t, lang]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="text-sm text-gray-500">
          {data.length} {t('register_items')}
          {selectedIds.size > 0 && (
            <span className="ml-2 text-boronia-navy font-medium">
              ({selectedIds.size} {t('register_selected')})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => console.log('Export items')}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md px-3 py-1.5 text-sm font-medium"
          >
            <Download size={14} />
            {t('btn_export')}
          </button>
          <button
            onClick={openImportWizard}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md px-3 py-1.5 text-sm font-medium"
          >
            <Upload size={14} />
            {t('export_import_excel')}
          </button>
          <button
            onClick={openQuickAdd}
            className="inline-flex items-center gap-1.5 bg-boronia-coral hover:bg-boronia-coral-light text-white rounded-md px-3 py-1.5 text-sm font-medium"
          >
            <Plus size={14} />
            {t('btn_add_item')}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar />

      {/* Grid */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto bg-white"
      >
        <table className="w-full border-collapse" role="grid">
          {/* Sticky header */}
          <thead className="sticky top-0 z-10 bg-gray-50 border-b-2 border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} role="row">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      role="columnheader"
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={`text-left text-[11px] font-semibold tracking-wider uppercase text-gray-500 px-3 h-10 whitespace-nowrap ${
                        canSort ? 'cursor-pointer select-none hover:text-gray-700' : ''
                      }`}
                      style={{ width: header.getSize() }}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && sorted === 'asc' && <ChevronUp size={12} />}
                        {canSort && sorted === 'desc' && <ChevronDown size={12} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Virtual body */}
          <tbody
            style={{ height: `${totalSize}px`, position: 'relative' }}
          >
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              const item = row.original;
              const overdue = isOverdue(item.dueDate, item.status);
              const isCritical = item.riskLevel === 'Critical';
              const isClosed = item.status === 'Closed' || item.status === 'Cancelled';
              const isSelected = selectedIds.has(item.id);

              return (
                <tr
                  key={row.id}
                  role="row"
                  onClick={() => openDetailPanel(item.id)}
                  className={`cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-50' : overdue ? 'bg-amber-50' : virtualRow.index % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}
                    ${isClosed ? 'text-gray-400' : ''}
                    hover:bg-gray-100
                  `}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    borderLeft: overdue
                      ? '4px solid #F59E0B'
                      : isCritical && !isClosed
                      ? '4px solid #DC2626'
                      : '4px solid transparent',
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      role="gridcell"
                      className="px-3 py-0"
                      style={{
                        width: cell.column.getSize(),
                        height: `${virtualRow.size}px`,
                        verticalAlign: 'middle',
                      }}
                    >
                      <div className="flex items-center h-full">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty state */}
        {data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-500 mb-4">{t('grid_no_match')}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => useItemStore.getState().clearFilters()}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md px-4 py-2 text-sm font-medium"
              >
                {t('btn_clear_filters')}
              </button>
              <button
                onClick={openQuickAdd}
                className="bg-boronia-coral hover:bg-boronia-coral-light text-white rounded-md px-4 py-2 text-sm font-medium"
              >
                {t('grid_create_item')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      <BulkActions />

      {/* Quick Add panel */}
      <QuickAdd />
    </div>
  );
}
