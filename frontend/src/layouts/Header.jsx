import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export const Header = () => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 z-20">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="PanelIQ" className="h-8 w-auto object-contain" />
      </div>
      
      <div className="flex items-center gap-1">
        <ThemeToggle />
        
        <button 
          aria-label="Notifications"
          className="h-8 w-8 rounded-md flex items-center justify-center text-txt hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <Bell className="h-[18px] w-[18px] text-txt" />
        </button>
        
        <div className="h-4 w-px bg-border mx-2" />
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <div className="h-7 w-7 rounded-full bg-surface-secondary border border-border flex items-center justify-center text-txt">
              <User className="h-4 w-4 text-txt" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-small font-semibold text-txt leading-tight">{user?.name || 'System Admin'}</div>
              <div className="text-[11px] font-medium text-txt-muted uppercase tracking-wider">{user?.role || 'ADMIN'}</div>
            </div>
            <ChevronDown className={`h-3 w-3 text-txt transition-transform duration-150 hidden sm:block ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg bg-surface-elevated border border-border py-1 z-50 shadow-2xl">
              <div className="px-3 py-2 border-b border-border">
                <div className="text-small font-semibold text-txt">{user?.name || 'User'}</div>
                <div className="text-caption text-txt-muted uppercase tracking-wider">{user?.role || 'User'}</div>
              </div>
              <button
                onClick={() => { setShowDropdown(false); logout(); }}
                className="w-full text-left px-3 py-2 text-small text-txt hover:bg-surface-hover transition-colors flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-txt" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
