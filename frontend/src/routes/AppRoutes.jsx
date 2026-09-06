import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { Login } from '../pages/Login';
import { SetPassword } from '../pages/SetPassword';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../pages/Dashboard/Dashboard';
import Sites from '../pages/Sites/Sites';
import SiteDetails from '../pages/Sites/SiteDetails';
import Panels from '../pages/Panels/Panels';
import PanelDetails from '../pages/Panels/PanelDetails';
import Performance from '../pages/Performance/Performance';
import Diagnostics from '../pages/Diagnostics/Diagnostics';
import PanelDiagnosticDetail from '../pages/Diagnostics/PanelDiagnosticDetail';
import Alerts from '../pages/Alerts/Alerts';
import Devices from '../pages/Devices/Devices';
import DeviceDetails from '../pages/Devices/DeviceDetails';
import HardwareControl from '../pages/Hardware/HardwareControl';
import SettingsLayout from '../pages/Settings/SettingsLayout';
import ProfileSettings from '../pages/Settings/ProfileSettings';
import Preferences from '../pages/Settings/Preferences';
import OrganizationSettings from '../pages/Settings/Admin/OrganizationSettings';
import UserManagement from '../pages/Settings/Admin/UserManagement';
import RolesPermissions from '../pages/Settings/Admin/RolesPermissions';
import SiteAdministration from '../pages/Settings/Admin/SiteAdministration';
import PanelConfiguration from '../pages/Settings/Admin/PanelConfiguration';
import SolarInsights from '../pages/SolarInsights/SolarInsights';

// Simple RBAC Wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role?.toUpperCase() || 'USER')) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Available to most roles */}
        <Route path="dashboard" element={
          <ProtectedRoute roles={['ADMIN', 'USER', 'VIEWER']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="sites" element={
          <ProtectedRoute roles={['ADMIN', 'USER']}>
            <Sites />
          </ProtectedRoute>
        } />
        
        <Route path="sites/:siteId" element={
          <ProtectedRoute roles={['ADMIN', 'USER']}>
            <SiteDetails />
          </ProtectedRoute>
        } />
        
        <Route path="panels" element={
          <ProtectedRoute roles={['ADMIN', 'USER']}>
            <Panels />
          </ProtectedRoute>
        } />
        
        <Route path="panels/:panelId" element={
          <ProtectedRoute roles={['ADMIN', 'USER']}>
            <PanelDetails />
          </ProtectedRoute>
        } />
        
        <Route path="performance" element={
          <ProtectedRoute roles={['ADMIN', 'USER', 'VIEWER']}>
            <Performance />
          </ProtectedRoute>
        } />
        
        <Route path="insights" element={
          <ProtectedRoute roles={['ADMIN', 'USER', 'VIEWER']}>
            <SolarInsights />
          </ProtectedRoute>
        } />
        
        <Route path="diagnostics" element={
          <ProtectedRoute roles={['ADMIN', 'USER']}>
            <Diagnostics />
          </ProtectedRoute>
        } />
        
        <Route path="panels/:panelId/diagnostics" element={
          <ProtectedRoute roles={['ADMIN', 'USER']}>
            <PanelDiagnosticDetail />
          </ProtectedRoute>
        } />
        
        <Route path="alerts" element={
          <ProtectedRoute roles={['ADMIN', 'USER', 'VIEWER']}>
            <Alerts />
          </ProtectedRoute>
        } />
        
        {/* Admin only routes */}
        <Route path="settings" element={
          <ProtectedRoute roles={['ADMIN', 'USER', 'VIEWER']}>
            <SettingsLayout />
          </ProtectedRoute>
        }>
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="preferences" element={<Preferences />} />
          <Route path="organization" element={
            <ProtectedRoute roles={['ADMIN']}><OrganizationSettings /></ProtectedRoute>
          } />
          <Route path="sites" element={
            <ProtectedRoute roles={['ADMIN']}><SiteAdministration /></ProtectedRoute>
          } />
          <Route path="panels" element={
            <ProtectedRoute roles={['ADMIN']}><PanelConfiguration /></ProtectedRoute>
          } />
          <Route path="users" element={
            <ProtectedRoute roles={['ADMIN']}><UserManagement /></ProtectedRoute>
          } />
          <Route path="roles" element={
            <ProtectedRoute roles={['ADMIN']}><RolesPermissions /></ProtectedRoute>
          } />
        </Route>
        
        <Route path="devices" element={
          <ProtectedRoute roles={['ADMIN', 'USER', 'VIEWER']}>
            <Devices />
          </ProtectedRoute>
        } />
        
        <Route path="devices/:deviceUid" element={
          <ProtectedRoute roles={['ADMIN', 'USER', 'VIEWER']}>
            <DeviceDetails />
          </ProtectedRoute>
        } />
        
        <Route path="hardware" element={
          <ProtectedRoute roles={['ADMIN', 'USER', 'VIEWER']}>
            <HardwareControl />
          </ProtectedRoute>
        } />
        

        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
