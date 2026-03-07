/**
 * App.jsx — CloseOut application root.
 * Wires HashRouter, layout shell, all routes, and global overlays.
 * Loads settings + items on mount; shows onboarding if not yet complete.
 */

import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import AppShell from './components/layout/AppShell.jsx';

// Page components
import Dashboard from './components/dashboard/Dashboard.jsx';
import ItemGrid from './components/grid/ItemGrid.jsx';
import RiskMatrix from './components/heatmap/RiskMatrix.jsx';
import ScatterPlot from './components/heatmap/ScatterPlot.jsx';
import KanbanBoard from './components/kanban/KanbanBoard.jsx';
import ByPerson from './components/views/ByPerson.jsx';
import ByDepartment from './components/views/ByDepartment.jsx';
import ByLocation from './components/views/ByLocation.jsx';
import ReportBuilder from './components/reports/ReportBuilder.jsx';
import Settings from './components/settings/Settings.jsx';

// Global overlays
import ItemPanel from './components/detail/ItemPanel.jsx';
import QuickAdd from './components/grid/QuickAdd.jsx';
import ImportWizard from './components/excel/ImportWizard.jsx';
import Welcome from './components/onboarding/Welcome.jsx';

// Stores
import useSettingsStore from './store/settingsStore.js';
import useItemStore from './store/itemStore.js';

function App() {
  const [ready, setReady] = useState(false);

  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const settings = useSettingsStore((s) => s.settings);
  const loadItems = useItemStore((s) => s.loadItems);

  useEffect(() => {
    async function init() {
      await loadSettings();
      await loadItems();
      setReady(true);
    }
    init();
  }, [loadSettings, loadItems]);

  // Show nothing until data is loaded
  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8F9FA]">
        <p className="text-boronia-navy text-sm font-medium">Loading...</p>
      </div>
    );
  }

  const onboardingComplete = settings?.onboardingComplete === true;

  return (
    <HashRouter>
      {/* Onboarding overlay — shown before anything else on first launch */}
      {!onboardingComplete && <Welcome />}

      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/register" element={<ItemGrid />} />
          <Route path="/risk-matrix" element={<RiskMatrix />} />
          <Route path="/scatter" element={<ScatterPlot />} />
          <Route path="/kanban" element={<KanbanBoard />} />
          <Route path="/by-person" element={<ByPerson />} />
          <Route path="/by-department" element={<ByDepartment />} />
          <Route path="/by-location" element={<ByLocation />} />
          <Route path="/reports" element={<ReportBuilder />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>

      {/* Global overlays — always rendered, visibility controlled by stores */}
      <ItemPanel />
      <QuickAdd />
      <ImportWizard />
    </HashRouter>
  );
}

export default App;
