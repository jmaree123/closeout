/**
 * App.jsx — CloseOut application root.
 * Wires HashRouter, layout shell, all routes, and global overlays.
 * Loads settings + items on mount; shows onboarding if not yet complete.
 * Gates the entire app behind Supabase authentication.
 */

import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { supabase } from './lib/supabase.js';
import LoginScreen from './components/auth/LoginScreen.jsx';

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
import ByPriority from './components/views/ByPriority.jsx';
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
import { migratePriorities } from './db/database.js';

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [ready, setReady] = useState(false);

  // ── Auth: check existing session + listen for changes ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ── App data loading (only when authenticated) ──
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const settings = useSettingsStore((s) => s.settings);
  const loadItems = useItemStore((s) => s.loadItems);

  useEffect(() => {
    if (!session) return;
    async function init() {
      await loadSettings();
      await migratePriorities();
      await loadItems();
      setReady(true);
    }
    init();
  }, [session, loadSettings, loadItems]);

  // ── Render gates ──

  // 1. Waiting for auth check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8F9FA]">
        <p className="text-boronia-navy text-sm font-medium">Loading...</p>
      </div>
    );
  }

  // 2. Not logged in → show login screen
  if (!session) {
    return <LoginScreen />;
  }

  // 3. Logged in but data still loading
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

      <AppShell onLogout={handleLogout}>
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
          <Route path="/by-priority" element={<ByPriority />} />
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
