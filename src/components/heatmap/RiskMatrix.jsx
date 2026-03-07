/**
 * RiskMatrix.jsx
 * Interactive 5x5 risk matrix built with D3.js.
 * Plots non-archived items by likelihood (Y) and consequence (X).
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { Download, Filter, X } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import useUiStore from '../../store/uiStore.js';
import {
  LIKELIHOOD_OPTIONS,
  CONSEQUENCE_OPTIONS,
  RISK_MATRIX,
  RISK_MATRIX_CELL_COLORS,
  TYPE_COLORS,
  ITEM_TYPES,
  STATUS_OPTIONS,
} from '../../utils/riskMatrix.js';
import { isOverdue, formatDate } from '../../utils/dateUtils.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateRiskLevel, translateLikelihood, translateConsequence, translateItemType, translateStatus } from '../../utils/displayLabels.js';

// Likelihood top to bottom: Almost Certain (top) → Rare (bottom)
const LIKELIHOOD_ORDER = [...LIKELIHOOD_OPTIONS];
// Consequence left to right
const CONSEQUENCE_ORDER = [...CONSEQUENCE_OPTIONS];

function getTextColor(bgHex) {
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1E2A3A' : '#FFFFFF';
}

export default function RiskMatrix() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);

  const { items, loadItems } = useItemStore();
  const { openDetailPanel } = useUiStore();
  const { t, lang } = useTranslation();

  // Track container size for responsive re-render
  const [containerSize, setContainerSize] = useState(0);
  useEffect(() => {
    const handleResize = () => setContainerSize(window.innerWidth + window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Local filter state
  const [filters, setFilters] = useState({
    itemType: '',
    department: '',
    location: '',
    assignedTo: '',
    status: '',
  });

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Derive unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const departments = [...new Set(items.map((i) => i.department).filter(Boolean))].sort();
    const locations = [...new Set(items.map((i) => i.location).filter(Boolean))].sort();
    const assignees = [...new Set(items.map((i) => i.assignedTo).filter(Boolean))].sort();
    return { departments, locations, assignees };
  }, [items]);

  // Apply local filters
  const filteredItems = useMemo(() => {
    let result = items.filter((i) => !i.isArchived);
    if (filters.itemType) result = result.filter((i) => i.itemType === filters.itemType);
    if (filters.department) result = result.filter((i) => i.department === filters.department);
    if (filters.location) result = result.filter((i) => i.location === filters.location);
    if (filters.assignedTo) result = result.filter((i) => i.assignedTo === filters.assignedTo);
    if (filters.status) result = result.filter((i) => i.status === filters.status);
    return result;
  }, [items, filters]);

  // Items with valid likelihood + consequence
  const plottableItems = useMemo(() => {
    return filteredItems.filter(
      (i) => LIKELIHOOD_OPTIONS.includes(i.likelihood) && CONSEQUENCE_OPTIONS.includes(i.consequence)
    );
  }, [filteredItems]);

  const totalNonArchived = useMemo(() => items.filter((i) => !i.isArchived).length, [items]);

  const clearFilters = useCallback(() => {
    setFilters({ itemType: '', department: '', location: '', assignedTo: '', status: '' });
  }, []);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = containerRef.current;
    if (!container) return;

    // Use the actual container dimensions — the container is flex-1 and fills available space
    const containerWidth = container.clientWidth - 8; // padding
    const availableHeight = Math.max(300, container.clientHeight - 8);

    const gap = 2;
    const marginLeft = 90;
    const marginBottom = 50;
    const marginTop = 10;

    // Cell size must fit both width and height constraints
    const maxCellFromWidth = Math.floor((containerWidth - marginLeft - 20) / 5);
    const maxCellFromHeight = Math.floor((availableHeight - marginTop - marginBottom - 8) / 5);
    const cellSize = Math.max(60, Math.min(maxCellFromWidth, maxCellFromHeight));

    const matrixWidth = cellSize * 5 + gap * 4;
    const matrixHeight = cellSize * 5 + gap * 4;
    const svgWidth = marginLeft + matrixWidth + 20;
    const svgHeight = marginTop + matrixHeight + marginBottom;

    svg.attr('width', svgWidth).attr('height', svgHeight)
       .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
       .style('max-width', '100%')
       .style('height', 'auto');

    // Group items by cell
    const cellMap = {};
    for (const li of LIKELIHOOD_ORDER) {
      for (const co of CONSEQUENCE_ORDER) {
        cellMap[`${li}|${co}`] = [];
      }
    }
    for (const item of plottableItems) {
      const key = `${item.likelihood}|${item.consequence}`;
      if (cellMap[key]) cellMap[key].push(item);
    }

    const g = svg.append('g').attr('transform', `translate(${marginLeft}, ${marginTop})`);

    // Draw cells
    LIKELIHOOD_ORDER.forEach((li, row) => {
      CONSEQUENCE_ORDER.forEach((co, col) => {
        const x = col * (cellSize + gap);
        const y = row * (cellSize + gap);
        const riskLevel = RISK_MATRIX[li]?.[co] || 'Low';
        const bgColor = RISK_MATRIX_CELL_COLORS[riskLevel] || '#27AE60';
        const textColor = getTextColor(bgColor);

        g.append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('fill', bgColor)
          .attr('rx', 4)
          .attr('ry', 4)
          .attr('opacity', 0.9);

        // Cell label (risk level text — translated)
        g.append('text')
          .attr('x', x + cellSize / 2)
          .attr('y', y + 16)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', textColor)
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .attr('font-family', 'Inter, sans-serif')
          .attr('opacity', 0.7)
          .text(translateRiskLevel(riskLevel, lang));

        // Plot item dots — scale sizes to cell size
        const cellItems = cellMap[`${li}|${co}`] || [];
        const dotRadius = cellSize < 80 ? 6 : 8;
        const dotPadding = cellSize < 80 ? 4 : 6;
        const startX = x + dotRadius + 4;
        const startY = y + (cellSize < 80 ? 22 : 30);
        const dotsPerRow = Math.max(2, Math.min(4, Math.floor((cellSize - 8) / (dotRadius * 2 + dotPadding))));
        const maxRows = Math.max(1, Math.floor((cellSize - startY + y - 16) / (dotRadius * 2 + dotPadding)));
        const maxVisible = dotsPerRow * maxRows;

        const visibleItems = cellItems.slice(0, maxVisible);
        visibleItems.forEach((item, idx) => {
          const dotRow = Math.floor(idx / dotsPerRow);
          const dotCol = idx % dotsPerRow;
          const cx = startX + dotCol * (dotRadius * 2 + dotPadding) + dotRadius;
          const cy = startY + dotRow * (dotRadius * 2 + dotPadding) + dotRadius;
          const color = TYPE_COLORS[item.itemType] || '#3498DB';
          const itemOverdue = isOverdue(item.dueDate, item.status);

          const dot = g
            .append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', dotRadius)
            .attr('fill', color)
            .attr('stroke', itemOverdue ? '#1E2A3A' : 'rgba(255,255,255,0.6)')
            .attr('stroke-width', itemOverdue ? 2 : 1)
            .attr('cursor', 'pointer')
            .style('transition', 'r 0.15s ease');

          if (itemOverdue) {
            dot.attr('stroke-dasharray', '3,2');
          }

          // Hover events
          dot.on('mouseover', (event) => {
            d3.select(event.target).attr('r', dotRadius + 2);
            const tooltip = tooltipRef.current;
            if (tooltip) {
              tooltip.style.display = 'block';
              tooltip.style.left = `${event.pageX + 12}px`;
              tooltip.style.top = `${event.pageY - 10}px`;
              tooltip.innerHTML = `
                <div class="text-xs font-semibold text-boronia-navy">${item.itemId}</div>
                <div class="text-xs font-medium mt-0.5">${item.title}</div>
                <div class="text-xs text-gray-500 mt-1">${t('field_assigned_to')}: ${item.assignedTo || t('view_unassigned')}</div>
                <div class="text-xs text-gray-500">${t('field_due_date')}: ${formatDate(item.dueDate) || '--'}</div>
                <div class="text-xs text-gray-500">${t('field_status')}: ${translateStatus(item.status, lang)}</div>
              `;
            }
          });

          dot.on('mousemove', (event) => {
            const tooltip = tooltipRef.current;
            if (tooltip) {
              tooltip.style.left = `${event.pageX + 12}px`;
              tooltip.style.top = `${event.pageY - 10}px`;
            }
          });

          dot.on('mouseout', (event) => {
            d3.select(event.target).attr('r', dotRadius);
            const tooltip = tooltipRef.current;
            if (tooltip) tooltip.style.display = 'none';
          });

          dot.on('click', () => {
            openDetailPanel(item.id);
          });
        });

        // "+N more" badge
        if (cellItems.length > maxVisible) {
          const extra = cellItems.length - maxVisible;
          const badgeY = startY + Math.ceil(maxVisible / dotsPerRow) * (dotRadius * 2 + dotPadding) + 4;
          g.append('text')
            .attr('x', x + cellSize / 2)
            .attr('y', Math.min(badgeY, y + cellSize - 6))
            .attr('text-anchor', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .attr('font-family', 'Inter, sans-serif')
            .text(`+${extra} ${t('risk_matrix_more')}`);
        }
      });
    });

    // Y-axis labels (Likelihood — translated)
    const labelFontSize = cellSize < 80 ? '10px' : '12px';
    LIKELIHOOD_ORDER.forEach((li, row) => {
      const y = marginTop + row * (cellSize + gap) + cellSize / 2;
      svg
        .append('text')
        .attr('x', marginLeft - 8)
        .attr('y', y)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#1E2A3A')
        .attr('font-size', labelFontSize)
        .attr('font-weight', '500')
        .attr('font-family', 'Inter, sans-serif')
        .text(translateLikelihood(li, lang));
    });

    // Y-axis title
    svg
      .append('text')
      .attr('x', 10)
      .attr('y', marginTop + matrixHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('transform', `rotate(-90, 10, ${marginTop + matrixHeight / 2})`)
      .attr('fill', '#1E2A3A')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('font-family', 'Inter, sans-serif')
      .text(t('risk_matrix_likelihood_axis'));

    // X-axis labels (Consequence — translated)
    CONSEQUENCE_ORDER.forEach((co, col) => {
      const x = marginLeft + col * (cellSize + gap) + cellSize / 2;
      svg
        .append('text')
        .attr('x', x)
        .attr('y', marginTop + matrixHeight + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', '#1E2A3A')
        .attr('font-size', labelFontSize)
        .attr('font-weight', '500')
        .attr('font-family', 'Inter, sans-serif')
        .text(translateConsequence(co, lang));
    });

    // X-axis title
    svg
      .append('text')
      .attr('x', marginLeft + matrixWidth / 2)
      .attr('y', marginTop + matrixHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#1E2A3A')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('font-family', 'Inter, sans-serif')
      .text(t('risk_matrix_consequence_axis'));
  }, [plottableItems, openDetailPanel, containerSize, t, lang]);

  const handleExportPng = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, { backgroundColor: '#FFFFFF' });
      const link = document.createElement('a');
      link.download = 'risk-matrix.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  return (
    <div className="bg-[#F8F9FA] h-full flex flex-col p-4 overflow-hidden">
      {/* Header row — compact */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-boronia-navy">{t('risk_matrix_title')}</h1>
          <span className="bg-boronia-navy/10 text-boronia-navy text-xs font-medium px-2 py-0.5 rounded-full">
            {plottableItems.length} {t('risk_matrix_items')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Type legend inline with header */}
          <div className="hidden md:flex items-center gap-3">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-gray-500 font-medium">{translateItemType(type, lang)}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-dashed border-gray-700" />
              <span className="text-[11px] text-gray-500 font-medium">{t('status_overdue')}</span>
            </div>
          </div>
          <button
            onClick={handleExportPng}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md px-3 py-1.5 text-xs font-medium"
          >
            <Download size={14} />
            {t('btn_export_png')}
          </button>
        </div>
      </div>

      {/* Compact filter bar — single row */}
      <div className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 mb-2 flex items-center gap-2 flex-shrink-0 overflow-x-auto">
        <Filter size={14} className="text-gray-400 flex-shrink-0" />

        <select
          value={filters.itemType}
          onChange={(e) => setFilters((f) => ({ ...f, itemType: e.target.value }))}
          className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 bg-white min-w-0"
        >
          <option value="">{t('filter_all_types')}</option>
          {ITEM_TYPES.map((tp) => (
            <option key={tp} value={tp}>{translateItemType(tp, lang)}</option>
          ))}
        </select>

        <select
          value={filters.department}
          onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
          className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 bg-white min-w-0"
        >
          <option value="">{t('filter_all_depts')}</option>
          {filterOptions.departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={filters.location}
          onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 bg-white min-w-0"
        >
          <option value="">{t('filter_all_locs')}</option>
          {filterOptions.locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <select
          value={filters.assignedTo}
          onChange={(e) => setFilters((f) => ({ ...f, assignedTo: e.target.value }))}
          className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 bg-white min-w-0"
        >
          <option value="">{t('filter_all_assignees')}</option>
          {filterOptions.assignees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 bg-white min-w-0"
        >
          <option value="">{t('filter_all_statuses')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{translateStatus(s, lang)}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-boronia-coral flex-shrink-0"
          >
            <X size={12} />
            {t('btn_clear')}
          </button>
        )}

        <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0">
          {plottableItems.length}/{totalNonArchived}
        </span>
      </div>

      {/* Matrix container — flex-grow to fill remaining space */}
      <div
        ref={containerRef}
        className="bg-white rounded-lg border border-gray-200 p-3 flex-1 min-h-0 flex items-center justify-center"
        data-chart="risk-matrix"
      >
        <svg ref={svgRef} />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 pointer-events-none max-w-xs"
        style={{ display: 'none' }}
      />
    </div>
  );
}
