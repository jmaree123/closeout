/**
 * Sidebar — fixed left navigation panel.
 * Navy background with Boronia logo, nav links, and overdue badge.
 * Collapses to icon-only at < 1024px.
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Table,
  Grid3X3,
  ScatterChart,
  Columns3,
  User,
  Building2,
  MapPin,
  Target,
  FileText,
  Settings,
} from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import logo from '../../assets/boronia_consulting_logo.jpg';

const NAV_ITEMS = [
  { to: '/dashboard', labelKey: 'nav_dashboard', icon: LayoutDashboard },
  { to: '/register', labelKey: 'nav_register', icon: Table },
  { to: '/risk-matrix', labelKey: 'nav_risk_matrix', icon: Grid3X3 },
  { to: '/scatter', labelKey: 'nav_scatter', icon: ScatterChart },
  { to: '/kanban', labelKey: 'nav_kanban', icon: Columns3 },
  { to: '/by-person', labelKey: 'nav_by_person', icon: User },
  { to: '/by-department', labelKey: 'nav_by_department', icon: Building2 },
  { to: '/by-location', labelKey: 'nav_by_location', icon: MapPin },
  { to: '/by-priority', labelKey: 'nav_by_priority', icon: Target },
  { to: '/reports', labelKey: 'nav_reports', icon: FileText },
  { to: '/settings', labelKey: 'nav_settings', icon: Settings },
];

export default function Sidebar({ collapsed }) {
  const overdueCount = useItemStore((s) => s.getOverdueCount());
  const { t } = useTranslation();

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-boronia-navy z-40 flex flex-col transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo area */}
      <div className={`flex flex-col items-center py-4 ${collapsed ? 'px-2' : 'px-4'}`}>
        <img
          src={logo}
          alt="Boronia Consulting"
          className={`object-contain transition-all duration-200 ${
            collapsed ? 'w-10 h-10 rounded-full' : 'w-[140px]'
          }`}
        />
        {!collapsed && (
          <span className="text-white text-xs font-medium mt-2 tracking-wide">
            CloseOut
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-2 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => {
          const label = t(labelKey);
          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-md text-sm transition-colors relative group ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
                } ${
                  isActive
                    ? 'text-white bg-boronia-navy-light font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-boronia-navy-light'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator — coral left border */}
                  {isActive && (
                    <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-boronia-coral" />
                  )}
                  <Icon size={18} className={collapsed ? '' : 'mr-3'} />
                  {!collapsed && <span>{label}</span>}

                  {/* Overdue badge on Dashboard */}
                  {to === '/dashboard' && overdueCount > 0 && (
                    <span
                      className={`bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${
                        collapsed
                          ? 'absolute -top-0.5 -right-0.5 w-4 h-4'
                          : 'ml-auto w-5 h-5'
                      }`}
                    >
                      {overdueCount > 99 ? '99+' : overdueCount}
                    </span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
