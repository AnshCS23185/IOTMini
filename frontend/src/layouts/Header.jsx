import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Button } from '../components/ui/Button';

const routeNames = {
  '/dashboard': 'Dashboard',
  '/sites': 'Sites',
  '/panels': 'Panels',
  '/performance': 'Performance',
  '/diagnostics': 'Diagnostics',
  '/alerts': 'Alerts',
  '/devices': 'Devices',
  '/hardware': 'Hardware Control',
  '/settings': 'Settings',
};

export const Header = () => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  
  // Find a matching route name, even for nested routes
  const currentPathKey = Object.keys(routeNames).find(key => pathname.startsWith(key));
  const title = currentPathKey ? routeNames[currentPathKey] : 'PanelIQ';

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="PanelIQ" className="h-10 sm:h-12 w-auto object-contain" />
        <div className="h-6 w-px bg-border hidden sm:block" />
        <h1 className="text-medium font-semibold text-text-muted m-0 hidden sm:block">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="h-6 w-px bg-border mx-2" />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-small font-medium text-text">{user?.name || 'User'}</div>
            <div className="text-xs text-text-muted">{user?.role || 'User'}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
