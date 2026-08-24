import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  Grid2X2, 
  Activity, 
  AlertTriangle, 
  Cpu, 
  Settings, 
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'USER', 'VIEWER'] },
  { name: 'Sites', path: '/sites', icon: MapPin, roles: ['ADMIN', 'USER'] },
  { name: 'Panels', path: '/panels', icon: Grid2X2, roles: ['ADMIN', 'USER'] },
  { name: 'Performance', path: '/performance', icon: Activity, roles: ['ADMIN', 'USER', 'VIEWER'] },
  { name: 'Diagnostics', path: '/diagnostics', icon: Server, roles: ['ADMIN', 'USER'] },
  { name: 'Alerts', path: '/alerts', icon: AlertTriangle, roles: ['ADMIN', 'USER', 'VIEWER'] },
  { name: 'Devices', path: '/devices', icon: Cpu, roles: ['ADMIN'] },
  { name: 'Hardware', path: '/hardware', icon: Cpu, roles: ['ADMIN'] },
  { name: 'Settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },
];

export const Sidebar = () => {
  const { user } = useAuth();
  const userRole = user?.role || 'USER';

  const visibleItems = navItems.filter(item => item.roles.includes(userRole.toUpperCase()));

  return (
    <aside className="w-14 flex flex-col items-center py-4 bg-surface border-r border-border h-full flex-shrink-0 z-10 pt-6">
      <nav className="flex flex-col gap-2 w-full px-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.name}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center justify-center h-10 w-10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                isActive 
                  ? 'bg-primary text-primary-text' 
                  : 'text-text-muted hover:bg-border/50 hover:text-text'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="absolute left-14 rounded bg-surface border border-border px-2 py-1 text-small font-medium text-text opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-sm z-50">
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
