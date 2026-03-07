/**
 * Dashboard — main dashboard layout.
 * Top row: SummaryCards
 * Second row: TrendChart (2/3) + StatusDonut (1/3)
 * Third row: OverduePanel (1/2) + UpcomingPanel (1/2)
 * Add Item button in top-right corner.
 */

import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUiStore from '../../store/uiStore.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import SummaryCards from './SummaryCards.jsx';
import TrendChart from './TrendChart.jsx';
import StatusDonut from './StatusDonut.jsx';
import OverduePanel from './OverduePanel.jsx';
import UpcomingPanel from './UpcomingPanel.jsx';

export default function Dashboard() {
  const loadItems = useItemStore((s) => s.loadItems);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const { t } = useTranslation();

  useEffect(() => {
    loadItems();
    loadSettings();
  }, [loadItems, loadSettings]);

  return (
    <div className="px-6 py-4 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-boronia-navy">{t('dashboard_title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('dashboard_subtitle')}</p>
        </div>
        <button
          onClick={openQuickAdd}
          className="inline-flex items-center gap-1.5 bg-boronia-coral hover:bg-boronia-coral-light text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          {t('btn_add_item')}
        </button>
      </div>

      {/* Row 1: Summary KPI cards */}
      <SummaryCards />

      {/* Row 2: Trend chart + Status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2">
          <TrendChart />
        </div>
        <div>
          <StatusDonut />
        </div>
      </div>

      {/* Row 3: Overdue + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <OverduePanel />
        <UpcomingPanel />
      </div>
    </div>
  );
}
