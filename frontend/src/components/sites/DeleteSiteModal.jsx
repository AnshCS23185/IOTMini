import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import { deleteSite } from '../../api/sites';
import { Button } from '../ui/Button';

export const DeleteSiteModal = ({ isOpen, onClose, site, organization, onSuccess }) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !site) return null;

  const orgName = organization?.name || site.orgName || 'Client';
  const isConfirmed = confirmInput.trim() === 'DELETE';

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setLoading(true);
    setError('');

    try {
      await deleteSite(site.id);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to delete site from database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in">
      <div 
        className="bg-surface-elevated rounded-lg shadow-2xl w-full max-w-[440px] flex flex-col overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-elevated shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-error/10 text-error flex items-center justify-center">
              <Trash2 className="h-4 w-4" />
            </div>
            <h2 className="text-[17px] font-bold text-txt">Delete Site?</h2>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="text-txt-muted hover:text-txt p-1.5 rounded-md hover:bg-surface-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleDelete} className="flex flex-col flex-1">
          <div className="p-5 space-y-3">
            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-md flex items-center gap-2 text-error text-small">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-surface border border-border rounded-lg p-3">
              <div className="text-small font-semibold text-txt">{orgName}</div>
              <div className="text-caption text-txt-muted mt-0.5">{site.name}</div>
            </div>

            <p className="text-small text-error/90 font-medium">
              This is a permanent, destructive action. All associated panel telemetry, alerts, and site configurations will be permanently removed.
            </p>

            <div className="pt-2">
              <label className="block text-caption text-txt-muted mb-1.5">
                Type <strong className="text-txt font-mono">DELETE</strong> to confirm:
              </label>
              <input 
                type="text"
                className="input-base w-full font-mono text-center tracking-widest text-error"
                placeholder="DELETE"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end items-center gap-2 px-5 py-3.5 border-t border-border bg-surface-elevated shrink-0">
            <Button variant="secondary" size="medium" onClick={onClose} disabled={loading} type="button">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              size="medium" 
              type="submit"
              disabled={!isConfirmed || loading}
            >
              {loading ? 'Deleting...' : 'Delete Site'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
