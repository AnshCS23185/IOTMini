import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { updateSite } from '../../api/sites';
import { updateOrganization } from '../../api/admin';
import { Button } from '../ui/Button';

export const DeactivateModal = ({ isOpen, onClose, site, organization, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !site) return null;

  const isDeactivating = site.status !== 'INACTIVE';
  const orgName = organization?.name || site.orgName || 'Client';

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    const targetStatus = isDeactivating ? 'INACTIVE' : 'ACTIVE';

    try {
      // 1. Update site status in backend
      await updateSite(site.id, { status: targetStatus });

      // 2. Also update organization status if linked
      if (organization?.id) {
        try {
          await updateOrganization(organization.id, { status: targetStatus });
        } catch (orgErr) {
          console.error("Failed to update organization status:", orgErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || `Failed to ${isDeactivating ? 'deactivate' : 'activate'} site.`);
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
            <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
              isDeactivating ? 'bg-amber-500/10 text-amber-400' : 'bg-success/10 text-success'
            }`}>
              {isDeactivating ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <h2 className="text-[17px] font-bold text-txt">
              {isDeactivating ? 'Deactivate Site & Access?' : 'Activate Site & Access?'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="text-txt-muted hover:text-txt p-1.5 rounded-md hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
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

          <p className="text-small text-txt-muted leading-relaxed">
            {isDeactivating
              ? 'This will disable normal customer access while preserving existing site configuration, telemetry, and historical data.'
              : 'This will restore active system monitoring and customer portal access for this site.'}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-2 px-5 py-3.5 border-t border-border bg-surface-elevated shrink-0">
          <Button variant="secondary" size="medium" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant={isDeactivating ? 'destructive' : 'primary'} 
            size="medium" 
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading 
              ? (isDeactivating ? 'Deactivating...' : 'Activating...') 
              : (isDeactivating ? 'Deactivate' : 'Activate')}
          </Button>
        </div>
      </div>
    </div>
  );
};
