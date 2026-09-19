import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { registerDevice } from '../../api/admin_iot';

export const RegisterDeviceModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    device_uid: '',
    device_type: 'PICO_W',
    firmware_version: 'v1.0'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registerDevice({
        device_uid: formData.device_uid,
        device_type: formData.device_type,
        firmware_version: formData.firmware_version,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to register device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-txt">Register IoT Device</h2>
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
              <label className="block text-sm font-medium text-txt mb-1">Device UID</label>
              <Input
                required
                placeholder="e.g. PICO-W-TEST-C"
                value={formData.device_uid}
                onChange={(e) => setFormData({ ...formData, device_uid: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-txt mb-1">Device Type</label>
              <Input
                required
                value={formData.device_type}
                onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-txt mb-1">Firmware Version</label>
              <Input
                required
                value={formData.firmware_version}
                onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })}
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register Device'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
