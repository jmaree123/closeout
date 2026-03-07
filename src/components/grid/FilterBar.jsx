/**
 * FilterBar — sits above the grid with search input and filter dropdowns.
 * Filters: Status, Risk Level, Department, Location, Assigned To, Item Type.
 * Active filters shown as removable chips below.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import {
  STATUS_OPTIONS,
  RISK_LEVELS,
  ITEM_TYPES,
} from '../../utils/riskMatrix.js';
import { useTranslation } from '../../hooks/useTranslation.js';

function FilterDropdown({ label, value, options, onChange }) {
  const hasValue = !!value;
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`border rounded-md text-sm py-1.5 pl-3 pr-8 appearance-none cursor-pointer transition-colors ${
        hasValue
          ? 'bg-boronia-navy/10 border-boronia-navy/30 text-boronia-navy font-medium'
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

export default function FilterBar() {
  const searchQuery = useItemStore((s) => s.searchQuery);
  const filters = useItemStore((s) => s.filters);
  const items = useItemStore((s) => s.items);
  const setSearch = useItemStore((s) => s.setSearch);
  const setFilter = useItemStore((s) => s.setFilter);
  const clearFilters = useItemStore((s) => s.clearFilters);

  const { t } = useTranslation();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef(null);

  // Debounce search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(localSearch);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [localSearch, setSearch]);

  // Sync external changes
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Build unique option sets from data
  const departments = [...new Set(items.map((i) => i.department).filter(Boolean))].sort();
  const locations = [...new Set(items.map((i) => i.location).filter(Boolean))].sort();
  const assignees = [...new Set(items.map((i) => i.assignedTo).filter(Boolean))].sort();

  // Active filter chips
  const activeFilters = Object.entries(filters)
    .filter(([, v]) => v != null)
    .map(([key, value]) => ({
      key,
      label: key === 'riskLevel' ? t('field_risk') : key === 'assignedTo' ? t('field_assigned_to') : key === 'itemType' ? t('field_item_type') : key === 'status' ? t('field_status') : key === 'department' ? t('field_department') : key === 'location' ? t('field_location') : key.charAt(0).toUpperCase() + key.slice(1),
      value,
    }));

  const hasAnyFilter = activeFilters.length > 0 || searchQuery;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Main filter row */}
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={t('filter_search_placeholder')}
            className="w-full border border-gray-200 rounded-md text-sm py-1.5 pl-9 pr-3 bg-white
                       focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                setSearch('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        <FilterDropdown
          label={t('filter_all_statuses')}
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(v) => setFilter('status', v)}
        />
        <FilterDropdown
          label={t('filter_all_risk_levels')}
          value={filters.riskLevel}
          options={RISK_LEVELS}
          onChange={(v) => setFilter('riskLevel', v)}
        />
        <FilterDropdown
          label={t('filter_all_departments')}
          value={filters.department}
          options={departments}
          onChange={(v) => setFilter('department', v)}
        />
        <FilterDropdown
          label={t('filter_all_locations')}
          value={filters.location}
          options={locations}
          onChange={(v) => setFilter('location', v)}
        />
        <FilterDropdown
          label={t('filter_all_assignees')}
          value={filters.assignedTo}
          options={assignees}
          onChange={(v) => setFilter('assignedTo', v)}
        />
        <FilterDropdown
          label={t('filter_all_types')}
          value={filters.itemType}
          options={ITEM_TYPES}
          onChange={(v) => setFilter('itemType', v)}
        />

        {/* Clear All */}
        {hasAnyFilter && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap ml-1"
          >
            {t('btn_clear_filters')}
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 pb-2 flex-wrap">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 text-xs font-medium bg-boronia-navy/10 text-boronia-navy rounded-full px-2.5 py-0.5"
            >
              {f.label}: {f.value}
              <button
                onClick={() => setFilter(f.key, null)}
                className="hover:text-boronia-coral ml-0.5"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
