import React, { useState, useEffect } from 'react';
import { createPanel, updatePanel, deletePanel } from '../../../api/admin';
import { getSitePanels } from '../../../api/panels'; // Reuse existing logic
import { getSites } from '../../../api/sites';
import { Loader2, Grid, Plus, Edit2, Trash2, Shield } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';

const PanelConfiguration = () => {
  const [sites, setSites] = useState([]);
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    site_id: '',
    rated_power_w: 400,
    tilt: 35,
    azimuth: 180,
    system_loss_percent: 14,
    status: 'ACTIVE'
  });
  
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const sitesRes = await getSites();
      setSites(sitesRes);
      
      let allPanels = [];
      for (const s of sitesRes) {
        try {
          const sitePanels = await getSitePanels(s.id);
          allPanels = [...allPanels, ...sitePanels.map(p => ({ ...p, siteName: s.name }))];
        } catch (e) {
          console.error(`Failed to load panels for site ${s.id}`);
        }
      }
      setPanels(allPanels);
    } catch (err) {
      setError('Failed to load panel configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEdit = (panel) => {
    if (panel) {
      setFormData({ 
        name: panel.name, 
        site_id: panel.site_id,
        rated_power_w: panel.rated_power_w,
        tilt: panel.tilt,
        azimuth: panel.azimuth,
        system_loss_percent: panel.system_loss_percent,
        status: panel.status
      });
      setEditingPanel(panel);
    } else {
      setFormData({ 
        name: '', 
        site_id: sites.length > 0 ? sites[0].id : '',
        rated_power_w: 400,
        tilt: 35,
        azimuth: 180,
        system_loss_percent: 14,
        status: 'ACTIVE'
      });
      setEditingPanel(null);
    }
    setIsEditing(true);
    setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation bounds for physical realities
    if (formData.tilt < 0 || formData.tilt > 90) {
      setSubmitError('Tilt must be between 0 and 90 degrees.');
      return;
    }
    if (formData.azimuth < 0 || formData.azimuth > 359) {
      setSubmitError('Azimuth must be between 0 and 359 degrees.');
      return;
    }
    if (formData.system_loss_percent < 0 || formData.system_loss_percent > 100) {
      setSubmitError('System loss must be a realistic percentage (0-100).');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const payload = { ...formData };
      payload.site_id = parseInt(payload.site_id);
      payload.rated_power_w = parseFloat(payload.rated_power_w);
      payload.tilt = parseFloat(payload.tilt);
      payload.azimuth = parseFloat(payload.azimuth);
      payload.system_loss_percent = parseFloat(payload.system_loss_percent);

      if (editingPanel) {
        // Remove site_id from payload if it's identical, as it shouldn't change
        if (payload.site_id === editingPanel.site_id) {
            delete payload.site_id;
        } else {
            throw new Error("Cannot move panel to a different site after creation.");
        }
        await updatePanel(editingPanel.id, payload);
      } else {
        await createPanel(payload.site_id, payload);
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
      await deletePanel(confirmDelete.id);
      setConfirmDelete(null);
      await fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to delete panel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && panels.length === 0) {
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
          <h3 className="text-body font-semibold text-txt">Panel Configuration</h3>
          <p className="text-small text-txt-muted">Manage PV panel physical properties for performance engine</p>
        </div>
        {!isEditing && (
          <Button variant="primary" onClick={() => handleOpenEdit(null)} className="h-8 text-caption">
            <Plus className="h-3 w-3 mr-1" /> Add Panel
          </Button>
        )}
      </div>

      {error && <div className="text-error text-small bg-error/10 p-3 rounded">{error}</div>}

      {isEditing ? (
        <div className="bg-surface border border-border p-6 rounded shadow-sm max-w-2xl">
          <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-2">
            <Grid className="h-4 w-4 text-primary" />
            <span className="font-semibold text-txt">{editingPanel ? 'Edit Panel Configuration' : 'Register New Panel'}</span>
          </div>
          
          <div className="mb-4 bg-warning/10 border border-status-warning/30 p-3 rounded flex gap-2">
            <Shield className="h-4 w-4 text-warning shrink-0" />
            <span className="text-caption text-txt-muted">
              Modifying physical properties (<strong className="text-warning">Tilt, Azimuth, System Losses</strong>) instantly changes expected output boundaries calculated by PVGIS.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-caption uppercase tracking-wider font-semibold text-txt-muted">Panel Name</label>
                <input required type="text" placeholder="e.g. P01" className="bg-background border border-border rounded px-3 py-2 text-small text-txt focus:outline-none focus:border-brand-orange" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-caption uppercase tracking-wider font-semibold text-txt-muted">Site Assignment</label>
                <select required disabled={!!editingPanel} className="bg-background border border-border rounded px-3 py-2 text-small text-txt focus:outline-none focus:border-brand-orange disabled:opacity-50" value={formData.site_id} onChange={e => setFormData({...formData, site_id: e.target.value})}>
                  <option value="">Select Site</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-caption uppercase tracking-wider font-semibold text-txt-muted">Rated Power (W)</label>
                <input required type="number" min="0" step="any" className="bg-background border border-border rounded px-3 py-2 text-small text-txt focus:outline-none focus:border-brand-orange" value={formData.rated_power_w} onChange={e => setFormData({...formData, rated_power_w: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-caption uppercase tracking-wider font-semibold text-txt-muted">Status</label>
                <select className="bg-background border border-border rounded px-3 py-2 text-small text-txt focus:outline-none focus:border-brand-orange" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-caption uppercase tracking-wider font-semibold text-txt-muted">Tilt (°)</label>
                <input required type="number" min="0" max="90" step="any" className="bg-background border border-border rounded px-3 py-2 text-small text-txt focus:outline-none focus:border-brand-orange" value={formData.tilt} onChange={e => setFormData({...formData, tilt: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-caption uppercase tracking-wider font-semibold text-txt-muted">Azimuth (°)</label>
                <input required type="number" min="0" max="359" step="any" className="bg-background border border-border rounded px-3 py-2 text-small text-txt focus:outline-none focus:border-brand-orange" value={formData.azimuth} onChange={e => setFormData({...formData, azimuth: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-caption uppercase tracking-wider font-semibold text-txt-muted">Sys. Loss (%)</label>
                <input required type="number" min="0" max="100" step="any" className="bg-background border border-border rounded px-3 py-2 text-small text-txt focus:outline-none focus:border-brand-orange" value={formData.system_loss_percent} onChange={e => setFormData({...formData, system_loss_percent: e.target.value})} />
              </div>
            </div>
            
            {submitError && <span className="text-caption text-error">{submitError}</span>}
            
            <div className="flex gap-3 mt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSubmitting} className="flex-1">Cancel</Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        </div>
      ) : confirmDelete ? (
        <div className="bg-surface border border-error/50 p-6 rounded shadow-sm max-w-xl">
           <div className="flex flex-col gap-2 mb-4">
             <span className="text-body font-bold text-txt">Delete Panel?</span>
             <span className="text-small text-txt-muted">Are you sure you want to permanently delete {confirmDelete.name}? Performance history related to this panel may become orphaned.</span>
           </div>
           {submitError && <span className="text-caption text-error block mb-3">{submitError}</span>}
           <div className="flex gap-3">
             <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={isSubmitting} className="flex-1">Cancel</Button>
             <Button variant="primary" onClick={handleDelete} disabled={isSubmitting} className="flex-1 bg-error hover:bg-error/80 text-background">
               {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
             </Button>
           </div>
        </div>
      ) : (
        <div className="border border-border bg-surface rounded overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-hover text-txt-muted text-caption uppercase tracking-wider">
                <th className="py-3 px-4 font-medium border-b border-border">Panel</th>
                <th className="py-3 px-4 font-medium border-b border-border">Site</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Power</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Config</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Status</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {panels.map((p, i) => (
                <tr key={p.id} className={`border-b border-border/30 hover:bg-surface-hover/10 transition-colors ${i % 2 === 0 ? '' : 'bg-border/5'}`}>
                  <td className="py-3 px-4 text-small text-txt font-medium">{p.name}</td>
                  <td className="py-3 px-4 text-small text-txt-muted">{p.siteName}</td>
                  <td className="py-3 px-4 text-center text-small font-mono text-txt-muted">{p.rated_power_w} W</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-caption text-txt-muted font-mono tracking-tighter" title={`Tilt: ${p.tilt}°, Azimuth: ${p.azimuth}°, Loss: ${p.system_loss_percent}%`}>
                      T:{p.tilt}° A:{p.azimuth}° L:{p.system_loss_percent}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleOpenEdit(p)} className="p-1.5 text-txt-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-txt-muted hover:text-error hover:bg-error/10 rounded transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {panels.length === 0 && (
                <tr><td colSpan="6" className="py-8 text-center text-small text-txt-muted">No panels found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PanelConfiguration;
