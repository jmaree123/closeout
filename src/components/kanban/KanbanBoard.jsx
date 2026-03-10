/**
 * KanbanBoard.jsx
 * Drag-and-drop Kanban board using @dnd-kit/core.
 * 5 columns: Open | In Progress | Pending Verification | Closed | Cancelled
 * Cards are draggable between columns to update item status.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { Filter, X } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import useUiStore from '../../store/uiStore.js';
import {
  STATUS_COLORS,
  TYPE_COLORS,
  RISK_COLORS,
  ITEM_TYPES,
  RISK_LEVELS,
} from '../../utils/riskMatrix.js';
import { isOverdue, formatDate, getDaysUntilDue } from '../../utils/dateUtils.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateStatus, translateRiskLevel, translateItemType } from '../../utils/displayLabels.js';

const COLUMNS = [
  'Open',
  'In Progress',
  'Pending Approval',
  'Pending Verification',
  'Closed',
  'Cancelled',
];

// ─── Droppable Column ────────────────────────────────────────────────

function KanbanColumn({ status, items, activeId, onCardClick, t, lang }) {
  const { isOver, setNodeRef } = useDroppable({ id: `column-${status}` });
  const statusColor = STATUS_COLORS[status] || '#9CA3AF';

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 flex flex-col rounded-lg border border-gray-200 bg-[#F1F5F9] transition-colors ${
        isOver ? 'ring-2 ring-blue-300 bg-blue-50/50' : ''
      }`}
      style={{ minWidth: 250, width: 280, borderTopWidth: 4, borderTopColor: statusColor }}
    >
      {/* Column header */}
      <div className="px-3 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-sm font-semibold text-boronia-navy">{translateStatus(status, lang)}</span>
        </div>
        <span className="bg-gray-100 text-gray-600 text-xs font-medium rounded-full px-2 py-0.5">
          {items.length}
        </span>
      </div>

      {/* Cards container */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2" style={{ maxHeight: 'calc(100vh - 230px)' }}>
        {items.map((item) => (
          <KanbanCard
            key={item.id || item.itemId}
            item={item}
            isDragOverlay={false}
            isBeingDragged={activeId === (item.id ?? item.itemId)}
            onClick={() => onCardClick(item.id)}
            t={t}
            lang={lang}
          />
        ))}
        {items.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">{t('view_no_items')}</div>
        )}
      </div>
    </div>
  );
}

// ─── Draggable Card ─────────────────────────────────────────────────

function KanbanCard({ item, isDragOverlay, isBeingDragged, onClick, t, lang }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id ?? item.itemId,
    data: { item },
  });

  const itemIsOverdue = isOverdue(item.dueDate, item.status);
  const daysUntil = getDaysUntilDue(item.dueDate);
  const typeColor = TYPE_COLORS[item.itemType] || '#3498DB';
  const riskColor = RISK_COLORS[item.riskLevel] || '#22C55E';

  let dueDateClass = 'text-gray-400';
  if (itemIsOverdue) {
    dueDateClass = 'text-red-600 font-medium';
  } else if (daysUntil !== null && daysUntil <= 3 && daysUntil >= 0) {
    dueDateClass = 'text-amber-600 font-medium';
  }

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const cardClasses = [
    'bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-shadow',
    itemIsOverdue ? 'border-l-[3px] border-l-red-500 border-t border-r border-b border-gray-200' : 'border-gray-200',
    isDragOverlay ? 'shadow-lg rotate-[2deg] opacity-95' : '',
    isBeingDragged && !isDragOverlay ? 'opacity-30' : '',
    !isDragOverlay ? 'hover:shadow-md' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const cardContent = (
    <div
      className={cardClasses}
      style={!isDragOverlay ? style : undefined}
      onClick={(e) => {
        // Don't trigger click when dragging
        if (!isDragOverlay && onClick) {
          onClick();
        }
      }}
    >
      {/* Item ID badge */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
        >
          {item.itemId}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-boronia-navy leading-snug line-clamp-2 mb-2">
        {item.title || 'Untitled'}
      </p>

      {/* Risk level pill */}
      {item.riskLevel && (
        <div className="mb-2">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${riskColor}15`, color: riskColor }}
          >
            {translateRiskLevel(item.riskLevel, lang)}
          </span>
        </div>
      )}

      {/* Assignee + Due Date */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 truncate max-w-[120px]">
          {item.assignedTo || (t ? t('view_unassigned') : 'Unassigned')}
        </span>
        <span className={dueDateClass}>
          {formatDate(item.dueDate) || '--'}
        </span>
      </div>

      {/* Department tag */}
      {item.department && (
        <div className="mt-1.5">
          <span className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
            {item.department}
          </span>
        </div>
      )}
    </div>
  );

  if (isDragOverlay) {
    return cardContent;
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {cardContent}
    </div>
  );
}

// ─── Main Board ─────────────────────────────────────────────────────

export default function KanbanBoard() {
  const { items, loadItems, updateItem } = useItemStore();
  const { openDetailPanel } = useUiStore();
  const { t, lang } = useTranslation();

  const [activeId, setActiveId] = useState(null);
  const [filters, setFilters] = useState({
    itemType: '',
    riskLevel: '',
    department: '',
    location: '',
    assignedTo: '',
  });

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Derive filter options
  const filterOptions = useMemo(() => {
    const departments = [...new Set(items.map((i) => i.department).filter(Boolean))].sort();
    const locations = [...new Set(items.map((i) => i.location).filter(Boolean))].sort();
    const assignees = [...new Set(items.map((i) => i.assignedTo).filter(Boolean))].sort();
    return { departments, locations, assignees };
  }, [items]);

  // Apply local filters (status is determined by column, so not filtered here)
  const filteredItems = useMemo(() => {
    let result = items.filter((i) => !i.isArchived);
    if (filters.itemType) result = result.filter((i) => i.itemType === filters.itemType);
    if (filters.riskLevel) result = result.filter((i) => i.riskLevel === filters.riskLevel);
    if (filters.department) result = result.filter((i) => i.department === filters.department);
    if (filters.location) result = result.filter((i) => i.location === filters.location);
    if (filters.assignedTo) result = result.filter((i) => i.assignedTo === filters.assignedTo);
    return result;
  }, [items, filters]);

  // Group items by status (columns)
  const columnItems = useMemo(() => {
    const map = {};
    for (const col of COLUMNS) {
      map[col] = [];
    }
    for (const item of filteredItems) {
      if (map[item.status]) {
        map[item.status].push(item);
      }
    }
    return map;
  }, [filteredItems]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const clearFilters = useCallback(() => {
    setFilters({ itemType: '', riskLevel: '', department: '', location: '', assignedTo: '' });
  }, []);

  // Active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return filteredItems.find((i) => (i.id ?? i.itemId) === activeId) || null;
  }, [activeId, filteredItems]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      // Determine target column from droppable ID
      const overIdStr = String(over.id);
      if (!overIdStr.startsWith('column-')) return;

      const targetStatus = overIdStr.replace('column-', '');
      if (!COLUMNS.includes(targetStatus)) return;

      // Find the dragged item
      const draggedItem = filteredItems.find((i) => (i.id ?? i.itemId) === active.id);
      if (!draggedItem) return;

      // Skip if same column
      if (draggedItem.status === targetStatus) return;

      // Update the item status
      try {
        const changes = { status: targetStatus };
        if (targetStatus === 'Closed') {
          changes.closeOutDate = new Date().toISOString().split('T')[0];
        }
        await updateItem(draggedItem.id, changes);
      } catch (err) {
        console.error('Failed to update item status:', err);
      }
    },
    [filteredItems, updateItem]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-boronia-navy">{t('kanban_title')}</h1>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-gray-400" />

        <select
          value={filters.itemType}
          onChange={(e) => setFilters((f) => ({ ...f, itemType: e.target.value }))}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="">{t('filter_all_types')}</option>
          {ITEM_TYPES.map((tp) => (
            <option key={tp} value={tp}>{translateItemType(tp, lang)}</option>
          ))}
        </select>

        <select
          value={filters.riskLevel}
          onChange={(e) => setFilters((f) => ({ ...f, riskLevel: e.target.value }))}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="">{t('filter_all_risk_levels')}</option>
          {RISK_LEVELS.map((r) => (
            <option key={r} value={r}>{translateRiskLevel(r, lang)}</option>
          ))}
        </select>

        <select
          value={filters.department}
          onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="">{t('filter_all_departments')}</option>
          {filterOptions.departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={filters.location}
          onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="">{t('filter_all_locations')}</option>
          {filterOptions.locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <select
          value={filters.assignedTo}
          onChange={(e) => setFilters((f) => ({ ...f, assignedTo: e.target.value }))}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="">{t('filter_all_assignees')}</option>
          {filterOptions.assignees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-boronia-coral ml-auto"
          >
            <X size={14} />
            {t('btn_clear_filters')}
          </button>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              items={columnItems[status] || []}
              activeId={activeId}
              onCardClick={openDetailPanel}
              t={t}
              lang={lang}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <div style={{ width: 264 }}>
              <KanbanCard item={activeItem} isDragOverlay={true} isBeingDragged={false} t={t} lang={lang} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
