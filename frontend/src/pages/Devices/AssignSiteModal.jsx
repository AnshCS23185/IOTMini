import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getSites } from '../../api/sites';
import { assignDeviceSite } from '../../api/admin_iot';

export const AssignSiteModal = ({ isOpen, onClose, onSuccess, deviceUid }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');

  useEffect(() => {
    if (isOpen) {
      getSites().then(setSites).catch(() => setError('Failed to load sites'));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSiteId) {
      setError('Please select a site');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await assignDeviceSite(deviceUid, selectedSiteId);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-txt">Assign Site</h2>
          <button onClick={onClose} className="text-txt-muted hover:text-txt transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 text-error text-sm rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-txt mb-1">Select Site</label>
              <select
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-primary"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                required
              >
                <option value="" disabled>Select a site...</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Site'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
