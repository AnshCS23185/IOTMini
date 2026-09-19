import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, Clock, ShieldAlert, BarChart2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const SeverityBadge = ({ severity }) => {
  let badgeStyle = 'bg-surface-secondary text-txt-muted border-border';
  if (severity === 'INFO') badgeStyle = 'bg-info/10 text-info border-info/20';
  if (severity === 'WARNING') badgeStyle = 'bg-warning/10 text-warning border-warning/20';
  if (severity === 'CRITICAL') badgeStyle = 'bg-error/15 text-error border-error/25';

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${badgeStyle}`}>
      {severity}
    </span>
  );
};

const formatTime = (ts) => ts ? new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';

export const AlertDetailDrawer = ({ alert, onClose, onAcknowledge, onResolve }) => {
  const navigate = useNavigate();
  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-secondary">
          <div className="flex items-center gap-3">
            <h2 className="text-h3 text-txt">Alert Details</h2>
            <SeverityBadge severity={alert.severity} />
          </div>
          <button onClick={onClose} className="p-2 text-txt-muted hover:text-txt hover:bg-surface-hover rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Header Info */}
          <div>
            <h3 className="text-h4 text-txt mb-1">{alert.fault_type}</h3>
            <p className="text-small text-txt-muted">{alert.message || 'No additional details provided.'}</p>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-surface-secondary border border-border">
                <div className="text-[11px] font-medium text-txt-muted uppercase tracking-wider mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${alert.status === 'ACTIVE' ? 'bg-error' : 'bg-success'}`} />
                  <span className="text-small font-semibold text-txt">{alert.status}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-secondary border border-border">
                <div className="text-[11px] font-medium text-txt-muted uppercase tracking-wider mb-1">Occurrences</div>
                <div className="text-small font-semibold text-txt">{alert.consecutive_count} consecutive</div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider mb-4">Lifecycle Timeline</h4>
            <div className="relative border-l border-border ml-2 space-y-6">
              
              <div className="relative pl-6">
                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-surface" />
                <div className="text-[11px] text-txt-muted font-mono">{formatTime(alert.first_detected_at)}</div>
                <div className="text-small font-medium text-txt mt-0.5">Alert Detected</div>
              </div>

              {alert.confirmed_at && (
                <div className="relative pl-6">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-warning ring-4 ring-surface" />
                  <div className="text-[11px] text-txt-muted font-mono">{formatTime(alert.confirmed_at)}</div>
                  <div className="text-small font-medium text-txt mt-0.5">Alert Confirmed</div>
                </div>
              )}

              {alert.acknowledged_at && (
                <div className="relative pl-6">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-info ring-4 ring-surface" />
                  <div className="text-[11px] text-txt-muted font-mono">{formatTime(alert.acknowledged_at)}</div>
                  <div className="text-small font-medium text-txt mt-0.5">Acknowledged</div>
                </div>
              )}

              {alert.resolved_at && (
                <div className="relative pl-6">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-success ring-4 ring-surface" />
                  <div className="text-[11px] text-txt-muted font-mono">{formatTime(alert.resolved_at)}</div>
                  <div className="text-small font-medium text-txt mt-0.5">Resolved</div>
                  <div className="text-[11px] text-txt-muted mt-0.5">
                    Duration: {Math.round((new Date(alert.resolved_at) - new Date(alert.first_detected_at)) / 60000)} minutes
                  </div>
                </div>
              )}

              {!alert.resolved_at && (
                <div className="relative pl-6">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-txt-muted/30 bg-surface ring-4 ring-surface" />
                  <div className="text-[11px] text-txt-muted font-mono">Current</div>
                  <div className="text-[11px] text-txt-muted mt-0.5">
                    Active for: {Math.round((new Date() - new Date(alert.first_detected_at)) / 60000)} minutes
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Diagnostic Snapshot */}
          <div>
            <h4 className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider mb-3">Diagnostic Snapshot (When Confirmed)</h4>
            <div className="bg-surface-secondary border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <tbody className="divide-y divide-border">
                  {alert.expected_power_w !== null && alert.expected_power_w !== undefined && (
                    <tr>
                      <td className="py-2 px-3 text-txt-muted font-medium">Expected Power</td>
                      <td className="py-2 px-3 text-txt font-mono">{alert.expected_power_w.toFixed(1)} W</td>
                    </tr>
                  )}
                  {alert.actual_power_w !== null && alert.actual_power_w !== undefined && (
                    <tr>
                      <td className="py-2 px-3 text-txt-muted font-medium">Actual Power</td>
                      <td className="py-2 px-3 text-txt font-mono">{alert.actual_power_w.toFixed(1)} W</td>
                    </tr>
                  )}
                  {alert.performance_percentage !== null && alert.performance_percentage !== undefined && (
                    <tr>
                      <td className="py-2 px-3 text-txt-muted font-medium">Performance</td>
                      <td className="py-2 px-3 text-txt font-mono">{(alert.performance_percentage * 100).toFixed(1)}%</td>
                    </tr>
                  )}
                  {alert.temperature !== null && alert.temperature !== undefined && (
                    <tr>
                      <td className="py-2 px-3 text-txt-muted font-medium">Temperature</td>
                      <td className="py-2 px-3 text-txt font-mono">{alert.temperature.toFixed(1)}°C</td>
                    </tr>
                  )}
                  {alert.light_intensity !== null && alert.light_intensity !== undefined && (
                    <tr>
                      <td className="py-2 px-3 text-txt-muted font-medium">LDR (Irradiance)</td>
                      <td className="py-2 px-3 text-txt font-mono">{alert.light_intensity.toFixed(0)}</td>
                    </tr>
                  )}
                  {alert.cloud_cover !== null && alert.cloud_cover !== undefined && (
                    <tr>
                      <td className="py-2 px-3 text-txt-muted font-medium">Cloud Cover</td>
                      <td className="py-2 px-3 text-txt font-mono">{alert.cloud_cover.toFixed(1)}%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface-secondary flex flex-col gap-3">
          <div className="flex gap-3">
            {alert.status === 'ACTIVE' && !alert.acknowledged_at && (
              <Button 
                variant="outline" 
                className="flex-1 text-info hover:bg-info/10 hover:text-info hover:border-info/30"
                onClick={() => onAcknowledge(alert.id)}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Acknowledge
              </Button>
            )}
            
            {alert.status === 'ACTIVE' && (
              <Button 
                variant="outline"
                className="flex-1 text-success hover:bg-success/10 hover:text-success hover:border-success/30"
                onClick={() => onResolve(alert.id)}
              >
                <ShieldAlert className="w-4 h-4 mr-2" /> Resolve Manually
              </Button>
            )}
          </div>
          
          <Button 
            variant="primary" 
            className="w-full"
            onClick={() => {
              onClose();
              navigate(`/performance?siteId=${alert.site_id}&panelId=${alert.panel_id}`);
            }}
          >
            <BarChart2 className="w-4 h-4 mr-2" /> View Panel Metrics
          </Button>
        </div>
      </div>
    </div>
  );
};
