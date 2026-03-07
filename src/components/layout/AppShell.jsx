/**
 * AppShell — layout wrapper providing sidebar + header + scrollable content area.
 * Sidebar is 240px wide on desktop, 64px (icon-only) below 1024px.
 */

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setCollapsed(window.innerWidth < 1024);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  return (
    <div className="h-screen bg-[#F8F9FA] overflow-hidden">
      <Sidebar collapsed={collapsed} />
      <Header sidebarCollapsed={collapsed} />
      <main
        className={`pt-14 h-screen transition-all duration-200 ${
          collapsed ? 'pl-16' : 'pl-60'
        }`}
      >
        <div className="h-full overflow-auto">{children}</div>
      </main>
    </div>
  );
}
