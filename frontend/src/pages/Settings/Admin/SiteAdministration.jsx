import React, { useState, useEffect } from 'react';
import { createSite, updateSite, deleteSite, getOrganizations } from '../../../api/admin';
import { getSites } from '../../../api/sites';
import { Loader2, Map, Plus, Edit2, Trash2, Shield, Globe } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';

const SiteAdministration = () => {
  const [sites, setSites] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    latitude: 0, 
    longitude: 0, 
    timezone: 'UTC', 
    status: 'ACTIVE', 
    organization_id: '' 
  });
  
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, oRes] = await Promise.all([getSites(), getOrganizations()]);
      setSites(sRes);
      setOrgs(oRes);
    } catch (err) {
      setError('Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEdit = (site) => {
    if (site) {
      setFormData({ 
        name: site.name, 
        latitude: site.latitude, 
        longitude: site.longitude, 
        timezone: site.timezone, 
        status: site.status, 
        organization_id: site.organization_id || '' 
      });
      setEditingSite(site);
    } else {
      setFormData({ 
        name: '', 
        latitude: 0, 
        longitude: 0, 
        timezone: 'UTC', 
        status: 'ACTIVE', 
        organization_id: orgs.length > 0 ? orgs[0].id : '' 
      });
      setEditingSite(null);
    }
    setIsEditing(true);
    setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (formData.latitude < -90 || formData.latitude > 90) {
      setSubmitError('Latitude must be between -90 and 90');
      return;
    }
    if (formData.longitude < -180 || formData.longitude > 180) {
      setSubmitError('Longitude must be between -180 and 180');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const payload = { ...formData };
      payload.organization_id = payload.organization_id ? parseInt(payload.organization_id) : null;
      payload.latitude = parseFloat(payload.latitude);
      payload.longitude = parseFloat(payload.longitude);

      if (editingSite) {
        await updateSite(editingSite.id, payload);
      } else {
        await createSite(payload);
      }
      
      await fetchData();
      setIsEditing(false);
    } catch (err) {
      setSubmitError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsSubmitting(true);
    try {
      await deleteSite(confirmDelete.id);
      setConfirmDelete(null);
      await fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to delete site. Ensure it has no dependent panels.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end border-b border-border/50 pb-2">
        <div>
          <h3 className="text-medium font-semibold text-text">Site Administration</h3>
          <p className="text-small text-text-muted">Manage solar site configurations and locations</p>
        </div>
        {!isEditing && (
          <Button variant="primary" onClick={() => handleOpenEdit(null)} className="h-8 text-[11px]">
            <Plus className="h-3 w-3 mr-1" /> Add Site
          </Button>
        )}
      </div>

      {error && <div className="text-status-error text-small bg-status-error/10 p-3 rounded">{error}</div>}

      {isEditing ? (
        <div className="bg-surface border border-border p-6 rounded shadow-sm max-w-2xl">
          <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="font-semibold text-text">{editingSite ? 'Edit Site Configuration' : 'Create New Site'}</span>
          </div>
          
          <div className="mb-4 bg-status-warning/10 border border-status-warning/30 p-3 rounded flex gap-2">
            <Shield className="h-4 w-4 text-status-warning shrink-0" />
            <span className="text-[11px] text-text-muted">
              Modifying <strong className="text-status-warning">Latitude, Longitude, or Timezone</strong> will immediately affect the PVGIS Expected Power calculations for this site. Ensure these coordinates are highly accurate.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Site Name</label>
              <input required type="text" className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Latitude</label>
                <input required type="number" step="any" min="-90" max="90" className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Longitude</label>
                <input required type="number" step="any" min="-180" max="180" className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Timezone</label>
                <input required type="text" placeholder="e.g. Asia/Kolkata" className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Status</label>
                <select className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Organization</label>
              <select required className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.organization_id} onChange={e => setFormData({...formData, organization_id: e.target.value})}>
                <option value="">Select Organization</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            
            {submitError && <span className="text-[11px] text-status-error">{submitError}</span>}
            
            <div className="flex gap-3 mt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSubmitting} className="flex-1">Cancel</Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Saving...' : 'Save Site Configuration'}
              </Button>
            </div>
          </form>
        </div>
      ) : confirmDelete ? (
        <div className="bg-surface border border-status-error/50 p-6 rounded shadow-sm max-w-xl">
           <div className="flex flex-col gap-2 mb-4">
             <span className="text-medium font-bold text-text">Delete Site?</span>
             <span className="text-small text-text-muted">Are you sure you want to permanently delete {confirmDelete.name}? This will fail if there are panels associated with it.</span>
           </div>
           {submitError && <span className="text-[11px] text-status-error block mb-3">{submitError}</span>}
           <div className="flex gap-3">
             <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={isSubmitting} className="flex-1">Cancel</Button>
             <Button variant="primary" onClick={handleDelete} disabled={isSubmitting} className="flex-1 bg-status-error hover:bg-status-error/80 text-background">
               {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
             </Button>
           </div>
        </div>
      ) : (
        <div className="border border-border bg-surface rounded overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-border/20 text-text-muted text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4 font-medium border-b border-border">Name</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Coordinates</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Timezone</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Status</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s, i) => (
                <tr key={s.id} className={`border-b border-border/30 hover:bg-border/10 transition-colors ${i % 2 === 0 ? '' : 'bg-border/5'}`}>
                  <td className="py-3 px-4 text-small text-text font-medium">{s.name}</td>
                  <td className="py-3 px-4 text-center text-small font-mono text-text-muted">
                    {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                  </td>
                  <td className="py-3 px-4 text-center text-small font-mono text-text-muted">{s.timezone}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleOpenEdit(s)} className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setConfirmDelete(s)} className="p-1.5 text-text-muted hover:text-status-error hover:bg-status-error/10 rounded transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {sites.length === 0 && (
                <tr><td colSpan="5" className="py-8 text-center text-small text-text-muted">No sites found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SiteAdministration;
