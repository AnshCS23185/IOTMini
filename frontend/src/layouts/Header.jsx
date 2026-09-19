import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, LogOut, ChevronDown, CheckCircle, ShieldAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../api/notifications';

const SeverityIndicator = ({ severity }) => {
  if (severity === 'CRITICAL') return <div className="w-2 h-2 rounded-full bg-error shrink-0 mt-1.5" />;
  if (severity === 'WARNING') return <div className="w-2 h-2 rounded-full bg-warning shrink-0 mt-1.5" />;
  return <div className="w-2 h-2 rounded-full bg-info shrink-0 mt-1.5" />;
};

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef = useRef(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Poll for unread count
  useEffect(() => {
    let isMounted = true;
    const fetchCount = async () => {
      try {
        const res = await getUnreadCount();
        if (isMounted) setUnreadCount(res.unread_count);
      } catch (e) {
        // silently fail polling
      }
    };
    
    fetchCount();
    const interval = setInterval(fetchCount, 60000); // 60s polling
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch full list when opening panel
  useEffect(() => {
    if (showNotifPanel) {
      const fetchList = async () => {
        setNotifLoading(true);
        try {
          const res = await getNotifications(10); // fetch top 10
          setNotifications(res);
        } catch (e) {
          console.error(e);
        } finally {
          setNotifLoading(false);
        }
      };
      fetchList();
    }
  }, [showNotifPanel]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markNotificationRead(notif.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (e) {
        console.error(e);
      }
    }
    setShowNotifPanel(false);
    navigate('/alerts'); // deep link to alerts
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 z-20">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="PanelIQ" className="h-8 w-auto object-contain" />
      </div>
      
      <div className="flex items-center gap-1 relative">
        <ThemeToggle />
        
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            aria-label="Notifications"
            className={`relative h-8 w-8 rounded-md flex items-center justify-center text-txt transition-colors cursor-pointer ${showNotifPanel ? 'bg-surface-hover' : 'hover:bg-surface-hover'}`}
          >
            <Bell className="h-[18px] w-[18px] text-txt" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-surface">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* Notification Panel */}
          {showNotifPanel && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg bg-surface-elevated border border-border flex flex-col z-50 shadow-2xl overflow-hidden origin-top-right">
              <div className="px-4 py-3 border-b border-border bg-surface-secondary flex items-center justify-between">
                <span className="text-small font-semibold text-txt">Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-txt hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              
              <div className="flex flex-col max-h-[350px] overflow-y-auto">
                {notifLoading ? (
                  <div className="p-4 flex justify-center"><div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center flex flex-col items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-txt-muted/50" />
                    <span className="text-small text-txt-muted">No recent notifications</span>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`flex gap-3 p-3 hover:bg-surface-hover cursor-pointer transition-colors ${!notif.is_read ? 'bg-surface/50' : 'opacity-70'}`}
                      >
                        <SeverityIndicator severity={notif.severity} />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className={`text-[13px] ${!notif.is_read ? 'font-semibold text-txt' : 'font-medium text-txt-muted'} truncate`}>
                            {notif.title}
                          </span>
                          <span className="text-[11px] text-txt-muted line-clamp-2 mt-0.5 leading-snug">
                            {notif.message}
                          </span>
                          <span className="text-[10px] text-txt-muted font-mono mt-1.5">
                            {new Date(notif.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-2 border-t border-border bg-surface-secondary">
                <button 
                  onClick={() => { setShowNotifPanel(false); navigate('/alerts'); }}
                  className="w-full py-1.5 rounded-md text-[12px] font-medium text-txt hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  View All Alerts
                </button>
              </div>
            </div>
          )}
        </div>
        
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
                onClick={logout}
                className="w-full text-left px-3 py-2 text-small text-error hover:bg-error/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
