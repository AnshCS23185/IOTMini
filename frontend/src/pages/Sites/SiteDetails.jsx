import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { getSite } from '../../api/sites';
import { getOrganizations, deleteSite } from '../../api/admin';
import { Loader2, ArrowLeft, MoreHorizontal, Building, Edit2, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

import { OverviewTab } from '../../components/sites/tabs/OverviewTab';
import { PanelsTab } from '../../components/sites/tabs/PanelsTab';
import { DevicesTab } from '../../components/sites/tabs/DevicesTab';
import { DiagnosticsTab } from '../../components/sites/tabs/DiagnosticsTab';
import { ConfigurationTab } from '../../components/sites/tabs/ConfigurationTab';
import { ClientAccessTab } from '../../components/sites/tabs/ClientAccessTab';
import { useAuth } from '../../context/AuthContext';

const SiteDetails = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const { siteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [site, setSite] = useState(null);
  const [org, setOrg] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchSiteData = async () => {
    try {
      setLoading(true);
      setError(null);
      const sId = Number(siteId);
      
      const siteData = await getSite(sId);
      setSite(siteData);
      
      try {
        const orgs = await getOrganizations();
        const siteOrg = orgs.find(o => o.id === siteData.organization_id);
        setOrg(siteOrg);
      } catch (e) {
        // Non-admin might not have org access
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load site details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteData();
  }, [siteId]);

  const handleDeleteSite = async () => {
    setDeleting(true);
    try {
      await deleteSite(site.id);
      navigate('/sites');
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete site. Ensure you have admin privileges.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Loading site details...</span>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-3">
        <AlertTriangle className="h-6 w-6 text-error" />
        <span className="text-small text-error font-medium">{error || "Site not found"}</span>
        <Button variant="outline" size="small" onClick={() => navigate('/sites')}>Back to Sites</Button>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview', path: `/sites/${siteId}/overview` },
    { id: 'panels', label: 'Panels', path: `/sites/${siteId}/panels` },
    { id: 'diagnostics', label: isAdmin ? 'Diagnostics' : 'Alerts', path: `/sites/${siteId}/diagnostics` },
  ];

  if (isAdmin) {
    navItems.push({ id: 'devices', label: 'Devices', path: `/sites/${siteId}/devices` });
    navItems.push({ id: 'configuration', label: 'Configuration', path: `/sites/${siteId}/configuration` });
    navItems.push({ id: 'access', label: 'Access', path: `/sites/${siteId}/access` });
  }

  const currentTab = location.pathname.split('/').pop() || 'overview';
  if (currentTab === siteId) {
    return <Navigate to={`/sites/${siteId}/overview`} replace />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header shrink-0 mb-3 pb-3">
        <div className="flex items-start gap-3">
          <button 
            onClick={() => navigate('/sites')}
            className="p-1 mt-0.5 text-txt-muted hover:text-txt hover:bg-surface-hover rounded transition-colors"
            title="Back to Sites"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] text-txt-muted mb-0.5 font-medium">
              <span className="hover:text-txt cursor-pointer" onClick={() => navigate('/sites')}>Sites</span>
              <span>/</span>
              <span>{org ? org.name : 'Unknown Client'}</span>
              <span>/</span>
              <span className="text-txt">{site.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-bold text-txt leading-tight">{site.name}</h1>
              <StatusBadge status={site.status || 'UNKNOWN'} />
            </div>
            <div className="text-[13px] text-txt-muted mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" />
                {org ? org.name : 'Unknown Client'}
              </span>
              <span>•</span> 
              <span>{site.location}</span>
              <span>•</span> 
              <span className="font-mono text-[11px]">{site.timezone}</span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link 
              to={`/sites/${siteId}/configuration`}
              className="flex items-center gap-1 px-3 h-[36px] border border-border text-txt rounded-lg text-small font-medium hover:bg-surface-hover transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5 text-txt" />
              Edit
            </Link>
            
            <div className="relative group">
              <Button variant="outline" size="small" className="px-2.5 h-[36px]">
                <MoreHorizontal className="h-4 w-4 text-txt" />
              </Button>
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface-elevated border border-border rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                <Link to={`/sites/${siteId}/configuration`} className="w-full text-left px-3 py-2 text-small text-txt hover:bg-surface-hover flex items-center">Edit Site</Link>
                <Link to={`/sites/${siteId}/panels`} className="w-full text-left px-3 py-2 text-small text-txt hover:bg-surface-hover flex items-center">Manage Panels</Link>
                <Link to={`/sites/${siteId}/devices`} className="w-full text-left px-3 py-2 text-small text-txt hover:bg-surface-hover flex items-center">Manage Devices</Link>
                <Link to={`/sites/${siteId}/access`} className="w-full text-left px-3 py-2 text-small text-txt hover:bg-surface-hover flex items-center">Manage Client Access</Link>
                <div className="h-px bg-border my-1"></div>
                <button 
                  className="w-full text-left px-3 py-2 text-small text-error hover:bg-error/10 flex items-center cursor-pointer"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Site
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-border mb-4 shrink-0">
        {navItems.map(tab => (
          <Link
            key={tab.id}
            to={tab.path}
            className={`py-2.5 text-small transition-colors relative ${
              currentTab === tab.id ? 'text-txt font-semibold border-b-2 border-primary' : 'text-txt-muted hover:text-txt'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <Routes>
          <Route path="/" element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewTab site={site} org={org} />} />
          <Route path="panels" element={<PanelsTab site={site} />} />
          <Route path="devices" element={<DevicesTab site={site} />} />
          <Route path="diagnostics" element={<DiagnosticsTab site={site} />} />
          <Route path="configuration" element={<ConfigurationTab site={site} onUpdate={fetchSiteData} />} />
          <Route path="access" element={<ClientAccessTab site={site} org={org} />} />
        </Routes>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in">
          <div className="bg-surface rounded-lg shadow-dropdown w-full max-w-[400px] flex flex-col border border-border overflow-hidden">
            <div className="p-5 flex flex-col items-center text-center">
              <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center mb-3">
                <AlertTriangle className="h-5 w-5 text-error" />
              </div>
              <h3 className="text-subsection font-semibold text-txt mb-1.5">Delete {site.name}?</h3>
              <p className="text-caption text-txt-muted mb-4">
                This action cannot be undone. All associated panels, devices, readings, and alerts will be permanently removed.
              </p>
              <label className="flex items-center gap-2 cursor-pointer bg-surface-secondary border border-border p-2.5 rounded w-full text-left">
                <input type="checkbox" required className="rounded text-primary focus:ring-primary h-3.5 w-3.5" id="confirm-delete" />
                <span className="text-caption text-txt-secondary">I understand this action cannot be undone.</span>
              </label>
            </div>
            <div className="bg-surface-secondary px-5 py-3 border-t border-border flex justify-end gap-2">
              <Button variant="outline" size="small" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button 
                variant="danger"
                size="small"
                onClick={() => {
                  const cb = document.getElementById('confirm-delete');
                  if (cb && cb.checked) handleDeleteSite();
                  else alert("Please confirm the deletion checkbox.");
                }} 
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Site'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteDetails;
