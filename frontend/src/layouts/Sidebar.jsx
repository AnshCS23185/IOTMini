import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, MapPin, Grid2X2, Activity, 
  AlertTriangle, Cpu, Settings, Server
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
    <aside className="w-[56px] flex flex-col items-center py-3 bg-surface border-r border-border h-full shrink-0 z-10">
      <nav className="flex flex-col gap-1 w-full px-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.name}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center justify-center h-9 w-9 mx-auto rounded-lg transition-colors cursor-pointer',
                isActive 
                  ? 'bg-[#D59D80]/15 text-[#D59D80]' 
                  : 'text-txt-muted hover:bg-surface-hover hover:text-txt'
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span className="absolute left-full ml-2.5 rounded-md bg-surface-elevated border border-border px-2.5 py-1 text-caption font-medium text-txt opacity-0 scale-95 transition-all duration-100 group-hover:opacity-100 group-hover:scale-100 pointer-events-none whitespace-nowrap shadow-xl z-50">
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
