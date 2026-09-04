import React, { useState } from 'react';
import { createPanel } from '../../../api/panels';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

export const AddPanelModal = ({ isOpen, onClose, siteId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [panelData, setPanelData] = useState({
    rated_power_w: 400,
    tilt: 20,
    azimuth: 180,
    system_loss_percent: 14,
    status: 'ACTIVE'
  });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      await createPanel(siteId, {
        rated_power_w: Number(panelData.rated_power_w),
        tilt: Number(panelData.tilt),
        azimuth: Number(panelData.azimuth),
        system_loss_percent: Number(panelData.system_loss_percent),
        status: panelData.status
      });
      
      setSuccess(true);
      setTimeout(() => {
        resetAndClose();
      }, 1500);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create panel');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setPanelData({ rated_power_w: 400, tilt: 20, azimuth: 180, system_loss_percent: 14, status: 'ACTIVE' });
    setError('');
    setSuccess(false);
    onClose();
    if (success) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-[400px] flex flex-col border border-border">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0">
          <h2 className="text-body font-semibold text-txt">Add Panel</h2>
          <button onClick={resetAndClose} className="text-txt-muted hover:text-txt p-1 rounded hover:bg-surface-hover transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-success mb-3" />
              <h3 className="text-body font-semibold text-txt mb-1">Panel Created</h3>
              <p className="text-small text-txt-muted">The panel was successfully added to the site.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {error && (
                <div className="p-2.5 bg-error/10 border border-error/20 rounded flex items-start gap-2 text-error text-caption">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <Input 
                label="Rated Power (W)" 
                type="number" 
                value={panelData.rated_power_w} 
                onChange={e => setPanelData({...panelData, rated_power_w: e.target.value})} 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Tilt (°)" 
                  type="number" 
                  value={panelData.tilt} 
                  onChange={e => setPanelData({...panelData, tilt: e.target.value})} 
                />
                <Input 
                  label="Azimuth (°)" 
                  type="number" 
                  value={panelData.azimuth} 
                  onChange={e => setPanelData({...panelData, azimuth: e.target.value})} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="System Losses (%)" 
                  type="number" 
                  value={panelData.system_loss_percent} 
                  onChange={e => setPanelData({...panelData, system_loss_percent: e.target.value})} 
                />
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-caption font-medium text-txt">Status</label>
                  <select 
                    className="h-8 rounded border border-border bg-surface px-3 text-small text-txt focus:outline-none focus:ring-1 focus:ring-brand-orange" 
                    value={panelData.status} 
                    onChange={e => setPanelData({...panelData, status: e.target.value})}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-5 py-4 border-t border-border bg-surface flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={resetAndClose} disabled={loading}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Panel'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
