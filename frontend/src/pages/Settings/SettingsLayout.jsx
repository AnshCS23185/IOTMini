import React from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Settings as SettingsIcon, Shield, Users, Map, Grid, Building } from 'lucide-react';

const SettingsLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Redirect to /settings/profile if directly accessing /settings
  if (location.pathname === '/settings' || location.pathname === '/settings/') {
    return <Navigate to="/settings/profile" replace />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col mb-4 shrink-0">
        <h2 className="text-large font-display font-semibold text-text leading-tight">Settings & Administration</h2>
        <span className="text-small text-text-muted">Manage your account and platform configurations</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <div className="w-full md:w-56 shrink-0 flex flex-col gap-1 overflow-y-auto pr-2">
           <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2 ml-3">Personal</span>
           <NavLink 
             to="/settings/profile"
             className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded text-small transition-colors ${isActive ? 'bg-border/20 text-primary font-semibold' : 'text-text-muted hover:text-text hover:bg-border/10'}`}
           >
             <User className="h-4 w-4" /> Profile
           </NavLink>
           <NavLink 
             to="/settings/preferences"
             className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded text-small transition-colors ${isActive ? 'bg-border/20 text-primary font-semibold' : 'text-text-muted hover:text-text hover:bg-border/10'}`}
           >
             <SettingsIcon className="h-4 w-4" /> Preferences
           </NavLink>

           {isAdmin && (
             <>
               <div className="mt-4 mb-2 border-t border-border/50 pt-4 ml-3">
                 <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Administration</span>
               </div>
               
               <NavLink 
                 to="/settings/users"
                 className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded text-small transition-colors ${isActive ? 'bg-border/20 text-primary font-semibold' : 'text-text-muted hover:text-text hover:bg-border/10'}`}
               >
                 <Users className="h-4 w-4" /> Users
               </NavLink>
               <NavLink 
                 to="/settings/roles"
                 className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded text-small transition-colors ${isActive ? 'bg-border/20 text-primary font-semibold' : 'text-text-muted hover:text-text hover:bg-border/10'}`}
               >
                 <Shield className="h-4 w-4" /> Roles & Permissions
               </NavLink>
               
               <div className="mt-4 mb-2 border-t border-border/50 pt-4 ml-3">
                 <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Configuration</span>
               </div>
               
               <NavLink 
                 to="/settings/organization"
                 className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded text-small transition-colors ${isActive ? 'bg-border/20 text-primary font-semibold' : 'text-text-muted hover:text-text hover:bg-border/10'}`}
               >
                 <Building className="h-4 w-4" /> Organization
               </NavLink>
               <NavLink 
                 to="/settings/sites"
                 className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded text-small transition-colors ${isActive ? 'bg-border/20 text-primary font-semibold' : 'text-text-muted hover:text-text hover:bg-border/10'}`}
               >
                 <Map className="h-4 w-4" /> Sites
               </NavLink>
               <NavLink 
                 to="/settings/panels"
                 className={({isActive}) => `flex items-center gap-3 px-3 py-2 rounded text-small transition-colors ${isActive ? 'bg-border/20 text-primary font-semibold' : 'text-text-muted hover:text-text hover:bg-border/10'}`}
               >
                 <Grid className="h-4 w-4" /> Panels
               </NavLink>
             </>
           )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;
