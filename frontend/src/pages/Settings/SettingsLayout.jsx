import React from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Settings as SettingsIcon, Shield, Users, Map, Grid, Building } from 'lucide-react';

const SettingsLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  if (location.pathname === '/settings' || location.pathname === '/settings/') {
    return <Navigate to="/settings/profile" replace />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex flex-col mb-5 shrink-0">
        <h1 className="text-[26px] sm:text-[28px] font-bold text-txt leading-tight tracking-tight">Settings & Administration</h1>
        <p className="text-[13px] sm:text-[14px] text-txt-muted mt-0.5 font-normal">Manage your account and platform configurations.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-56 shrink-0 flex flex-col gap-1 overflow-y-auto pr-2">
           <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold mb-1 ml-2">Personal</span>
           <NavLink 
             to="/settings/profile"
             className={({isActive}) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-small transition-colors ${isActive ? 'bg-[#D59D80]/15 text-[#D59D80] font-semibold' : 'text-txt-muted hover:text-txt hover:bg-surface-hover'}`}
           >
             <User className="h-4 w-4" /> Profile
           </NavLink>
           <NavLink 
             to="/settings/preferences"
             className={({isActive}) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-small transition-colors ${isActive ? 'bg-[#D59D80]/15 text-[#D59D80] font-semibold' : 'text-txt-muted hover:text-txt hover:bg-surface-hover'}`}
           >
             <SettingsIcon className="h-4 w-4" /> Preferences
           </NavLink>

           {isAdmin && (
             <>
               <div className="mt-4 mb-1 border-t border-border pt-3 ml-2">
                 <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Administration</span>
               </div>
               
               <NavLink 
                 to="/settings/users"
                 className={({isActive}) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-small transition-colors ${isActive ? 'bg-[#D59D80]/15 text-[#D59D80] font-semibold' : 'text-txt-muted hover:text-txt hover:bg-surface-hover'}`}
               >
                 <Users className="h-4 w-4" /> Users
               </NavLink>
               <NavLink 
                 to="/settings/roles"
                 className={({isActive}) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-small transition-colors ${isActive ? 'bg-[#D59D80]/15 text-[#D59D80] font-semibold' : 'text-txt-muted hover:text-txt hover:bg-surface-hover'}`}
               >
                 <Shield className="h-4 w-4" /> Roles & Permissions
               </NavLink>
               
               <div className="mt-4 mb-1 border-t border-border pt-3 ml-2">
                 <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Configuration</span>
               </div>
               
               <NavLink 
                 to="/settings/organization"
                 className={({isActive}) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-small transition-colors ${isActive ? 'bg-[#D59D80]/15 text-[#D59D80] font-semibold' : 'text-txt-muted hover:text-txt hover:bg-surface-hover'}`}
               >
                 <Building className="h-4 w-4" /> Organization
               </NavLink>
               <NavLink 
                 to="/settings/sites"
                 className={({isActive}) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-small transition-colors ${isActive ? 'bg-[#D59D80]/15 text-[#D59D80] font-semibold' : 'text-txt-muted hover:text-txt hover:bg-surface-hover'}`}
               >
                 <Map className="h-4 w-4" /> Sites
               </NavLink>
               <NavLink 
                 to="/settings/panels"
                 className={({isActive}) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-small transition-colors ${isActive ? 'bg-[#D59D80]/15 text-[#D59D80] font-semibold' : 'text-txt-muted hover:text-txt hover:bg-surface-hover'}`}
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
