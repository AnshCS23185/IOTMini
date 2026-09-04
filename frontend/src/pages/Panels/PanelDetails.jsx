import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPanel, getPanelPerformance, getPanelDiagnostics, getPanelAlerts, updatePanel, updatePanelStatus, deletePanel } from '../../api/panels';
import { getSite } from '../../api/sites';
import { ArrowLeft, Info, Zap, AlertTriangle, Activity, Edit3, Power, Trash2, X } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import PerformanceVisualization from '../Dashboard/PerformanceVisualization';

// ─── Confirm Modal ───────────────────────────────────────────────
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel, variant = 'primary', loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[16px] font-semibold text-txt">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-hover text-txt-muted hover:text-txt cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-small text-txt-muted mb-5 leading-relaxed">{message}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="small" onClick={onClose}>Cancel</Button>
            <Button variant={variant} size="small" onClick={onConfirm} disabled={loading}>
              {loading ? 'Processing...' : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PanelDetails = () => {
  const { panelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [panel, setPanel] = useState(null);
  const [site, setSite] = useState(null);
  const [perf, setPerf] = useState(null);
  const [diag, setDiag] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Action state
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const pId = Number(panelId);
      const panelData = await getPanel(pId);
      
      const [siteData, perfData, diagData, alertsData] = await Promise.allSettled([
        getSite(panelData.site_id),
        getPanelPerformance(pId),
        getPanelDiagnostics(pId),
        getPanelAlerts(pId),
      ]);

      setPanel(panelData);
      setSite(siteData.value || null);
      setPerf(perfData.value || null);
      setDiag(diagData.value || null);
      setAlerts(alertsData.value || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load panel details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [panelId]);

  // ─── Action handlers ──────────────────────────────────────────
  const handleStatusToggle = async () => {
    if (!panel) return;
    setActionLoading(true);
    try {
      const newStatus = panel.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await updatePanelStatus(panel.id, newStatus);
      showFeedback(`Panel ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
      setConfirmAction(null);
      fetchData();
    } catch (err) {
      showFeedback(err.message || 'Failed to update status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!panel) return;
    setActionLoading(true);
    try {
      await deletePanel(panel.id);
      showFeedback('Panel deleted.');
      navigate('/panels');
    } catch (err) {
      showFeedback(err.message || 'Failed to delete panel.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="h-5 w-5 rounded-full border-2 border-[#B86F50] border-t-transparent animate-spin mb-3" />
        <span className="text-txt-muted text-small">Loading panel details...</span>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-error text-body font-semibold">{error || 'Panel not found'}</span>
        <Button variant="outline" onClick={() => navigate('/panels')}>Back to Panels</Button>
      </div>
    );
  }

  // Determine operational states
  const isNighttime = perf?.expected_power_w === 0;
  const isNoData = !perf || perf.actual_power_w == null;
  const displayStatus = isNighttime ? 'NO_SOLAR' : (isNoData ? 'NO_DATA' : (diag?.status || panel.status));

  const actualPower = isNoData ? 0 : perf.actual_power_w;
  const expectedPower = perf?.expected_power_w || 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* Toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-xl text-small font-medium animate-in ${
          feedback.type === 'error'
            ? 'bg-error/15 text-error border-error/30'
            : 'bg-success/15 text-success border-success/30'
        }`}>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/panels')}
            className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-txt-muted hover:text-txt cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-txt" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-bold text-txt leading-tight">{panel.name}</h1>
              <StatusBadge status={displayStatus} />
            </div>
            <span className="text-[13px] text-txt-muted mt-0.5 font-normal">
              {site?.name || panel.site_name || `Site ${panel.site_id}`} • Rated Power: {panel.rated_power_w} W
            </span>
          </div>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="small" onClick={() => setConfirmAction('deactivate')}>
              <Power className="h-3.5 w-3.5" />
              {panel.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
            </Button>
            <Button variant="danger" size="small" onClick={() => setConfirmAction('delete')}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Info + Performance row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0 mb-4">
        
        {/* Panel Configuration */}
        <div className="p-3.5 border border-border bg-surface rounded-lg flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Info className="h-4 w-4 text-primary" />
            <h3 className="text-caption font-semibold text-txt uppercase tracking-wider">Configuration</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-3">
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">Technology</span>
              <span className="text-small font-medium text-txt">{panel.technology || 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">System Losses</span>
              <span className="text-small font-medium text-txt">{panel.system_losses}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">Tilt</span>
              <span className="text-small font-medium text-txt">{panel.tilt ? `${panel.tilt}°` : 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">Azimuth</span>
              <span className="text-small font-medium text-txt">{panel.azimuth ? `${panel.azimuth}°` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Current Performance */}
        <div className="p-3.5 border border-border bg-surface rounded-lg flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-caption font-semibold text-txt uppercase tracking-wider">Current Performance</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-3">
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">Actual Output</span>
              <span className="text-small font-medium text-txt font-mono">
                {isNoData ? '—' : `${actualPower.toFixed(1)} W`}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">Expected Output</span>
              <span className="text-small font-medium text-txt font-mono">{expectedPower.toFixed(1)} W</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">Performance</span>
              <span className="text-small font-medium text-txt font-mono">
                {perf?.performance_percentage != null ? `${perf.performance_percentage.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">Status</span>
              <StatusBadge status={displayStatus} />
            </div>
          </div>
        </div>

        {/* Performance Visualization */}
        <div className="min-h-[160px]">
          <PerformanceVisualization 
            currentPower={actualPower} 
            expectedPower={expectedPower} 
          />
        </div>
      </div>

      {/* Diagnostics + Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0 mb-4">
        {/* Diagnostics & Weather */}
        <div className="p-4 border border-border bg-surface rounded-lg flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-warning" />
            <h3 className="text-caption font-semibold text-txt uppercase tracking-wider">Diagnostics</h3>
          </div>
          
          {diag?.reason && (
            <div className="p-3 bg-surface-hover border border-border rounded text-small text-txt">
              <span className="font-semibold block mb-1">Diagnostic Reason:</span>
              {diag.reason}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">LDR (Light)</span>
              <span className="text-small font-medium text-txt">{diag?.light_intensity != null ? diag.light_intensity.toFixed(0) : 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">LDR Base</span>
              <span className="text-small font-medium text-txt">{diag?.light_baseline != null ? diag.light_baseline.toFixed(0) : 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">Temp</span>
              <span className="text-small font-medium text-txt">{diag?.temperature != null ? `${diag.temperature}°C` : 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-txt-muted">Clouds</span>
              <span className="text-small font-medium text-txt">{diag?.cloud_cover != null ? `${diag.cloud_cover}%` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Alerts History */}
        <div className="p-4 border border-border bg-surface rounded-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-error" />
              <h3 className="text-caption font-semibold text-txt uppercase tracking-wider">Recent Alerts</h3>
            </div>
            <span className="text-small font-medium bg-border px-2 rounded-full text-txt-muted">
              {alerts.length}
            </span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px] pr-1">
            {alerts.length === 0 ? (
              <div className="text-small text-txt-muted flex items-center justify-center h-20 bg-surface-hover rounded">
                No recent alerts
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="flex flex-col p-2 border border-border/50 bg-background rounded">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-small font-semibold text-error">{alert.fault_type}</span>
                    <span className="text-caption text-txt-muted font-mono">{new Date(alert.first_detected_at).toLocaleString()}</span>
                  </div>
                  <span className="text-small text-txt-muted leading-tight">{alert.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Modals ────────────────────────────────────────────── */}
      {confirmAction === 'deactivate' && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleStatusToggle}
          title={panel.status === 'INACTIVE' ? 'Activate Panel' : 'Deactivate Panel'}
          message={
            panel.status === 'INACTIVE'
              ? `Activate "${panel.name}"? It will resume normal monitoring.`
              : `Deactivate "${panel.name}"? It will be excluded from performance calculations.`
          }
          confirmLabel={panel.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
          loading={actionLoading}
        />
      )}

      {confirmAction === 'delete' && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleDelete}
          title="Delete Panel"
          message={`Permanently delete "${panel.name}"? All performance data and diagnostics will be lost. This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={actionLoading}
        />
      )}
      
    </div>
  );
};

export default PanelDetails;
