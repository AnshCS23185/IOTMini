import React, { useState } from 'react';
import { updateSite } from '../../../api/admin';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const ConfigurationTab = ({ site, onUpdate }) => {
  const [configData, setConfigData] = useState({
    name: site.name || '',
    location: site.location || '',
    latitude: site.latitude || '',
    longitude: site.longitude || '',
    timezone: site.timezone || 'UTC',
    status: site.status || 'ACTIVE'
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const hasChanges = 
    configData.name !== site.name ||
    configData.location !== site.location ||
    String(configData.latitude) !== String(site.latitude) ||
    String(configData.longitude) !== String(site.longitude) ||
    configData.timezone !== site.timezone ||
    configData.status !== site.status;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      await updateSite(site.id, {
        name: configData.name,
        location: configData.location,
        latitude: parseFloat(configData.latitude),
        longitude: parseFloat(configData.longitude),
        timezone: configData.timezone,
        status: configData.status
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update site configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      <div className="card p-0 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-secondary">
          <h3 className="text-body font-semibold text-txt">Site Parameters</h3>
          <p className="text-[11px] text-txt-muted mt-0.5">Physical location coordinates and operational state.</p>
        </div>
        
        <div className="p-4 flex flex-col gap-3">
          {error && (
            <div className="p-2.5 bg-error/10 border border-error/20 rounded flex items-center gap-2 text-error text-caption">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="p-2.5 bg-success/10 border border-success/20 rounded flex items-center gap-2 text-success text-caption">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Configuration updated successfully.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Site Name" value={configData.name} onChange={e => setConfigData({...configData, name: e.target.value})} />
            <Input label="Location" value={configData.location} onChange={e => setConfigData({...configData, location: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Latitude" type="number" step="any" value={configData.latitude} onChange={e => setConfigData({...configData, latitude: e.target.value})} />
            <Input label="Longitude" type="number" step="any" value={configData.longitude} onChange={e => setConfigData({...configData, longitude: e.target.value})} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-caption font-semibold text-txt-muted uppercase tracking-wider">Timezone</label>
              <select className="input-base cursor-pointer" value={configData.timezone} onChange={e => setConfigData({...configData, timezone: e.target.value})}>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-caption font-semibold text-txt-muted uppercase tracking-wider">Status</label>
              <select className="input-base cursor-pointer" value={configData.status} onChange={e => setConfigData({...configData, status: e.target.value})}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>
          
          <div className="mt-2 pt-3 border-t border-border flex justify-end gap-2">
            <Button variant="primary" size="small" onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
