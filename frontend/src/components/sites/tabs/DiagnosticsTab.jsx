import React, { useState, useEffect } from 'react';
import { getSitePanels, getPanelDiagnostics } from '../../../api/panels';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const DiagnosticsTab = ({ site }) => {
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllDiagnostics = async () => {
      try {
        setLoading(true);
        const panels = await getSitePanels(site.id);
        
        const diagPromises = panels.map(async (panel) => {
          try {
            const diag = await getPanelDiagnostics(panel.id);
            return { panel, ...diag };
          } catch (e) {
            return null;
          }
        });
        
        const results = await Promise.all(diagPromises);
        setDiagnostics(results.filter(r => r !== null && r.alerts && r.alerts.length > 0));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (site?.id) fetchAllDiagnostics();
  }, [site]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-body font-semibold text-txt">Site Diagnostics</h3>
      </div>

      <div className="flex-1 overflow-auto">
        {diagnostics.length === 0 ? (
          <div className="card flex flex-col items-center justify-center h-44 text-txt-muted text-center p-4">
            <CheckCircle2 className="h-6 w-6 mb-2 text-success opacity-80" />
            <span className="text-caption font-medium text-txt">No active diagnostic anomalies</span>
            <span className="text-[11px] text-txt-muted mt-0.5">All monitored string panels are operating within tolerance limits.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {diagnostics.map((diag, idx) => (
              <div key={idx} className="card p-0 overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-surface-secondary flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-error" />
                    <span className="text-caption font-semibold text-txt">Panel {diag.panel.panel_id_string || `P${diag.panel.id.toString().padStart(3, '0')}`}</span>
                  </div>
                  <span className="text-[11px] font-mono text-txt-muted">{new Date(diag.timestamp).toLocaleString()}</span>
                </div>
                
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] uppercase text-txt-muted font-medium block">Status</span>
                    <span className="text-caption font-semibold text-error">{diag.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-txt-muted font-medium block">Actual</span>
                    <span className="text-caption font-mono font-medium text-txt">{diag.actual_power_w.toFixed(1)} W</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-txt-muted font-medium block">Expected</span>
                    <span className="text-caption font-mono font-medium text-txt-secondary">{diag.expected_power_w.toFixed(1)} W</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-txt-muted font-medium block">Ratio</span>
                    <span className="text-caption font-mono font-bold text-error">{diag.performance_ratio.toFixed(1)}%</span>
                  </div>
                </div>
                
                {diag.alerts && diag.alerts.length > 0 && (
                  <div className="px-3 py-2 bg-error/10 border-t border-error/15 flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-error font-semibold tracking-wider">Detected Faults</span>
                    {diag.alerts.map((alert, aidx) => (
                      <div key={aidx} className="text-caption text-txt flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-error shrink-0"></span>
                        <span className="font-semibold">{alert.fault_type}:</span> {alert.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
