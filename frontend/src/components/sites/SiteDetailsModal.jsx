import React from 'react';
import { X, Building, MapPin, Grid2X2, Zap, Activity, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';

export const SiteDetailsModal = ({ isOpen, onClose, site, organization }) => {
  if (!isOpen || !site) return null;

  const dash = site.dash;
  const currentPower = dash 
    ? (dash.current_power_w >= 1000 
        ? `${(dash.current_power_w / 1000).toFixed(2)} kW` 
        : `${dash.current_power_w.toFixed(1)} W`)
    : '0 W';

  const performance = dash?.performance_percentage != null 
    ? `${dash.performance_percentage.toFixed(1)}%` 
    : '—';

  const panelCount = dash?.total_panels ?? site.panelsCount ?? 0;
  const activeAlerts = site.activeAlerts ?? 0;
  const locationText = site.location || site.address || '—';
  const orgName = organization?.name || site.orgName || '—';
  const contactInfo = organization?.contact_information || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in">
      <div 
        className="bg-surface-elevated rounded-lg shadow-2xl w-full max-w-[560px] flex flex-col max-h-[90vh] overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated shrink-0">
          <div>
            <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Site Details</span>
            <h2 className="text-[20px] font-bold text-txt leading-snug mt-0.5">{site.name}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-txt-muted hover:text-txt p-1.5 rounded-md hover:bg-surface-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Client / Installation Info */}
          <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-txt">
                <Building className="h-4 w-4 text-[#D59D80]" />
                <span className="text-small font-semibold">Client Organization</span>
              </div>
              <span className="text-small font-medium text-txt">{orgName}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-txt-muted">
                <MapPin className="h-4 w-4 text-txt-muted" />
                <span className="text-small">Location</span>
              </div>
              <span className="text-small font-medium text-txt text-right max-w-[280px] truncate" title={locationText}>
                {locationText}
              </span>
            </div>

            {contactInfo !== '—' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-txt-muted">
                  <User className="h-4 w-4 text-txt-muted" />
                  <span className="text-small">Contact</span>
                </div>
                <span className="text-small font-medium text-txt text-right max-w-[280px] truncate">
                  {contactInfo}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-border">
              <span className="text-small text-txt-muted">System Status</span>
              <StatusBadge status={site.status || 'ACTIVE'} />
            </div>
          </div>

          {/* Operational Metrics Grid */}
          <div>
            <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold mb-2.5 block">
              Operational Metrics
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Panels */}
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-txt-muted mb-1">
                  <Grid2X2 className="h-3.5 w-3.5 text-[#C6C0D0]" />
                  <span className="text-caption">Panels</span>
                </div>
                <span className="text-[18px] font-bold text-txt font-mono">{panelCount}</span>
              </div>

              {/* Current Output */}
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-txt-muted mb-1">
                  <Zap className="h-3.5 w-3.5 text-[#D59D80]" />
                  <span className="text-caption">Output</span>
                </div>
                <span className="text-[18px] font-bold text-txt font-mono">{currentPower}</span>
              </div>

              {/* Performance */}
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-txt-muted mb-1">
                  <Activity className="h-3.5 w-3.5 text-[#6C8F8A]" />
                  <span className="text-caption">Perf.</span>
                </div>
                <span className="text-[18px] font-bold text-txt font-mono">{performance}</span>
              </div>

              {/* Active Alerts */}
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-txt-muted mb-1">
                  <AlertCircle className="h-3.5 w-3.5 text-error" />
                  <span className="text-caption">Alerts</span>
                </div>
                <span className={`text-[18px] font-bold font-mono ${activeAlerts > 0 ? 'text-error' : 'text-txt'}`}>
                  {activeAlerts}
                </span>
              </div>
            </div>
          </div>

          {/* Geographic Coordinates & Timezone */}
          <div className="bg-surface border border-border rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-small">
              <span className="text-txt-muted">Latitude / Longitude</span>
              <span className="font-mono text-txt">
                {site.latitude != null ? site.latitude.toFixed(4) : '—'}, {site.longitude != null ? site.longitude.toFixed(4) : '—'}
              </span>
            </div>
            <div className="flex justify-between text-small">
              <span className="text-txt-muted">Timezone</span>
              <span className="font-mono text-txt">{site.timezone || 'UTC'}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center px-6 py-4 border-t border-border bg-surface-elevated shrink-0">
          <Button variant="secondary" size="medium" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
