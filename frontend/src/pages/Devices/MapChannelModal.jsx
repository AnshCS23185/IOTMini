import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getSitePanels } from '../../api/panels';
import { createDeviceMapping } from '../../api/admin_iot';

export const MapChannelModal = ({ isOpen, onClose, onSuccess, deviceUid, siteId, existingMappings }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [panels, setPanels] = useState([]);
  
  const [channelNumber, setChannelNumber] = useState('1');
  const [selectedPanelId, setSelectedPanelId] = useState('');

  useEffect(() => {
    if (isOpen && siteId) {
      getSitePanels(siteId).then(setPanels).catch(() => setError('Failed to load panels for site'));
    }
  }, [isOpen, siteId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPanelId) {
      setError('Please select a panel');
      return;
    }
    if (!channelNumber || isNaN(parseInt(channelNumber))) {
      setError('Invalid channel number');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await createDeviceMapping(deviceUid, {
        panel_id: parseInt(selectedPanelId),
        channel_number: parseInt(channelNumber),
        is_active: true
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to map channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-txt">Map Channel to Panel</h2>
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
              <label className="block text-sm font-medium text-txt mb-1">Physical Channel</label>
              <select
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-primary"
                value={channelNumber}
                onChange={(e) => setChannelNumber(e.target.value)}
                required
              >
                <option value="1">CH1 (Relay 1 - Safety)</option>
                <option value="2">CH2 (Relay 2 - Control)</option>
                <option value="3">CH3</option>
                <option value="4">CH4</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-txt mb-1">Logical Panel</label>
              <select
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-txt focus:outline-none focus:border-primary"
                value={selectedPanelId}
                onChange={(e) => setSelectedPanelId(e.target.value)}
                required
              >
                <option value="" disabled>Select a panel from assigned site...</option>
                {panels.map(p => {
                  const isMapped = existingMappings.find(m => m.panel_id === p.id && m.is_active);
                  return (
                    <option key={p.id} value={p.id} disabled={!!isMapped}>
                      {p.name} {isMapped ? '(Already Mapped)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Mapping...' : 'Map Channel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
