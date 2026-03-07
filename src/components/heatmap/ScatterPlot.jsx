/**
 * ScatterPlot.jsx
 * Effort vs Risk scatter plot using Plotly.js (factory pattern).
 * Quadrant labels: DO FIRST, PLAN CAREFULLY, DO WHEN ABLE, RECONSIDER.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Download, Filter, X } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import useUiStore from '../../store/uiStore.js';
import {
  TYPE_COLORS,
  ITEM_TYPES,
  RISK_LEVELS,
  STATUS_OPTIONS,
} from '../../utils/riskMatrix.js';
import { getDaysOverdue, formatDate } from '../../utils/dateUtils.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import { translateItemType, translateRiskLevel, translateEffort, translateStatus } from '../../utils/displayLabels.js';

const Plot = createPlotlyComponent(Plotly);

const EFFORT_MAP = { Low: 1, Medium: 2, High: 3 };
const RISK_MAP = { Low: 1, Medium: 2, High: 3, Critical: 4 };

// Stable jitter per item (seeded by itemId hash)
function hashJitter(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return ((hash % 100) / 100) * 0.3 - 0.15;
}

export default function ScatterPlot() {
  const { items, loadItems } = useItemStore();
  const { openDetailPanel } = useUiStore();
  const { t, lang } = useTranslation();

  // Local filters
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

  const filterOptions = useMemo(() => {
    const departments = [...new Set(items.map((i) => i.department).filter(Boolean))].sort();
    const locations = [...new Set(items.map((i) => i.location).filter(Boolean))].sort();
    const assignees = [...new Set(items.map((i) => i.assignedTo).filter(Boolean))].sort();
    return { departments, locations, assignees };
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items.filter((i) => !i.isArchived);
    if (filters.itemType) result = result.filter((i) => i.itemType === filters.itemType);
    if (filters.department) result = result.filter((i) => i.department === filters.department);
    if (filters.location) result = result.filter((i) => i.location === filters.location);
    if (filters.assignedTo) result = result.filter((i) => i.assignedTo === filters.assignedTo);
    if (filters.status) result = result.filter((i) => i.status === filters.status);
    return result;
  }, [items, filters]);

  // Items with valid effort + risk
  const plottableItems = useMemo(() => {
    return filteredItems.filter(
      (i) => EFFORT_MAP[i.effortEstimate] !== undefined && RISK_MAP[i.riskLevel] !== undefined
    );
  }, [filteredItems]);

  const totalNonArchived = useMemo(() => items.filter((i) => !i.isArchived).length, [items]);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const clearFilters = useCallback(() => {
    setFilters({ itemType: '', department: '', location: '', assignedTo: '', status: '' });
  }, []);

  // Build Plotly traces grouped by item type
  const traces = useMemo(() => {
    const grouped = {};
    for (const type of Object.keys(TYPE_COLORS)) {
      grouped[type] = [];
    }
    for (const item of plottableItems) {
      const type = item.itemType || 'Project Action';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(item);
    }

    return Object.entries(grouped)
      .filter(([, items]) => items.length > 0)
      .map(([type, typeItems]) => {
        const color = TYPE_COLORS[type] || '#3498DB';

        const x = [];
        const y = [];
        const sizes = [];
        const customdata = [];
        const ids = [];

        for (const item of typeItems) {
          const effortVal = EFFORT_MAP[item.effortEstimate];
          const riskVal = RISK_MAP[item.riskLevel];
          const jitterX = hashJitter(item.itemId + 'x');
          const jitterY = hashJitter(item.itemId + 'y');
          const daysOver = getDaysOverdue(item.dueDate, item.status) || 0;
          const dotSize = Math.min(24, Math.max(8, 8 + daysOver * 0.5));

          x.push(effortVal + jitterX);
          y.push(riskVal + jitterY);
          sizes.push(dotSize);
          ids.push(item.id);
          customdata.push([
            item.itemId,
            item.title || '',
            translateItemType(item.itemType || '', lang),
            item.assignedTo || t('view_unassigned'),
            formatDate(item.dueDate) || '--',
            daysOver > 0 ? daysOver : 'N/A',
          ]);
        }

        return {
          x,
          y,
          customdata,
          ids,
          type: 'scatter',
          mode: 'markers',
          name: translateItemType(type, lang),
          marker: {
            color,
            size: sizes,
            opacity: 0.85,
            line: { width: 1, color: 'rgba(255,255,255,0.7)' },
          },
          hovertemplate:
            `${t('field_item_id')}: %{customdata[0]}<br>` +
            `${t('field_title')}: %{customdata[1]}<br>` +
            `${t('field_item_type')}: %{customdata[2]}<br>` +
            `${t('field_assigned_to')}: %{customdata[3]}<br>` +
            `${t('field_due_date')}: %{customdata[4]}<br>` +
            `${t('view_overdue')}: %{customdata[5]}<extra></extra>`,
        };
      });
  }, [plottableItems, t, lang]);

  const layout = useMemo(
    () => ({
      font: { family: 'Inter, sans-serif', size: 12, color: '#1E2A3A' },
      paper_bgcolor: 'white',
      plot_bgcolor: 'white',
      margin: { l: 80, r: 40, t: 20, b: 60 },
      xaxis: {
        title: { text: t('field_effort_estimate'), font: { size: 13, weight: 600 } },
        tickvals: [1, 2, 3],
        ticktext: [translateEffort('Low', lang), translateEffort('Medium', lang), translateEffort('High', lang)],
        range: [0.3, 3.7],
        gridcolor: '#F1F5F9',
        zeroline: false,
      },
      yaxis: {
        title: { text: t('scatter_y_axis'), font: { size: 13, weight: 600 } },
        tickvals: [1, 2, 3, 4],
        ticktext: [translateRiskLevel('Low', lang), translateRiskLevel('Medium', lang), translateRiskLevel('High', lang), translateRiskLevel('Critical', lang)],
        range: [0.3, 4.7],
        gridcolor: '#F1F5F9',
        zeroline: false,
      },
      shapes: [
        // Vertical dashed line at x=1.5
        {
          type: 'line',
          x0: 1.5,
          x1: 1.5,
          y0: 0.3,
          y1: 4.7,
          line: { dash: 'dash', color: '#CBD5E1', width: 1.5 },
        },
        // Horizontal dashed line at y=2.5
        {
          type: 'line',
          x0: 0.3,
          x1: 3.7,
          y0: 2.5,
          y1: 2.5,
          line: { dash: 'dash', color: '#CBD5E1', width: 1.5 },
        },
      ],
      annotations: [
        {
          x: 0.9,
          y: 4.4,
          text: t('scatter_do_first'),
          showarrow: false,
          font: { size: 14, color: '#CBD5E1', weight: 700 },
          opacity: 0.8,
        },
        {
          x: 2.85,
          y: 4.4,
          text: t('scatter_plan_carefully'),
          showarrow: false,
          font: { size: 14, color: '#CBD5E1', weight: 700 },
          opacity: 0.8,
        },
        {
          x: 0.9,
          y: 0.6,
          text: t('scatter_do_when_able'),
          showarrow: false,
          font: { size: 14, color: '#CBD5E1', weight: 700 },
          opacity: 0.8,
        },
        {
          x: 2.85,
          y: 0.6,
          text: t('scatter_reconsider'),
          showarrow: false,
          font: { size: 14, color: '#CBD5E1', weight: 700 },
          opacity: 0.8,
        },
      ],
      showlegend: true,
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.02,
        xanchor: 'left',
        x: 0,
        font: { size: 12 },
      },
      hovermode: 'closest',
    }),
    [t, lang]
  );

  const handleClick = useCallback(
    (eventData) => {
      if (eventData && eventData.points && eventData.points.length > 0) {
        const point = eventData.points[0];
        const trace = traces[point.curveNumber];
        if (trace && trace.ids && trace.ids[point.pointNumber]) {
          openDetailPanel(trace.ids[point.pointNumber]);
        }
      }
    },
    [traces, openDetailPanel]
  );

  const handleExportPng = useCallback(() => {
    const plotEl = document.querySelector('.js-plotly-plot');
    if (plotEl) {
      Plotly.downloadImage(plotEl, {
        format: 'png',
        width: 1200,
        height: 700,
        filename: 'scatter-plot',
      });
    }
  }, []);

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-boronia-navy">
            {t('scatter_title')}
          </h1>
          <span className="bg-boronia-navy/10 text-boronia-navy text-sm font-medium px-2.5 py-0.5 rounded-full">
            {plottableItems.length} {t('risk_matrix_items')}
          </span>
        </div>
        <button
          onClick={handleExportPng}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md px-4 py-2 text-sm font-medium"
        >
          <Download size={16} />
          {t('btn_export_png')}
        </button>
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

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="">{t('filter_all_statuses')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{translateStatus(s, lang)}</option>
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

        <span className="text-xs text-gray-400 ml-auto">
          {plottableItems.length} / {totalNonArchived} {t('register_items')}
        </span>
      </div>

      {/* Plot */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <Plot
          data={traces}
          layout={layout}
          config={{
            displayModeBar: false,
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '600px' }}
          onClick={handleClick}
        />
      </div>
    </div>
  );
}
