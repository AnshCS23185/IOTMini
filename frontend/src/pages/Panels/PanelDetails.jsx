import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPanel, getPanelPerformance, getPanelDiagnostics, getPanelAlerts, getPanelDevice } from '../../api/panels';
import { getDeviceStatus } from '../../api/iot';
import { getSite } from '../../api/sites';
import { Loader2, ArrowLeft, Activity, Info, Zap, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import PerformanceVisualization from '../Dashboard/PerformanceVisualization';

const PanelDetails = () => {
  const { panelId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [panel, setPanel] = useState(null);
  const [site, setSite] = useState(null);
  const [perf, setPerf] = useState(null);
  const [diag, setDiag] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [device, setDevice] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const pId = Number(panelId);
      const panelData = await getPanel(pId);
      
      const [siteData, perfData, diagData, alertsData, deviceData] = await Promise.allSettled([
        getSite(panelData.site_id),
        getPanelPerformance(pId),
        getPanelDiagnostics(pId),
        getPanelAlerts(pId),
        getPanelDevice(pId)
      ]);

      setPanel(panelData);
      setSite(siteData.value || null);
      setPerf(perfData.value || null);
      setDiag(diagData.value || null);
      setAlerts(alertsData.value || []);

      if (deviceData.status === 'fulfilled' && deviceData.value?.device_uid) {
        try {
          const deviceStatus = await getDeviceStatus(deviceData.value.device_uid);
          setDevice({
            ...deviceData.value,
            ...deviceStatus
          });
        } catch (e) {
          setDevice({ ...deviceData.value, is_online: false, device_status: 'UNKNOWN' });
        }
      }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-text-muted text-medium">Loading panel diagnostics...</span>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-status-error text-medium font-semibold">{error || 'Panel not found'}</span>
        <Button variant="outline" onClick={() => navigate('/panels')}>Back to Panels</Button>
      </div>
    );
  }

  // Determine operational states
  const isNighttime = perf?.expected_power_w === 0;
  const isNoData = !perf || perf.actual_power_w == null;
  const displayStatus = isNighttime ? 'NO_SOLAR' : (isNoData ? 'NO_DATA' : (diag?.status || panel.status));

  // Determine actual numerical values for visualization
  const actualPower = isNoData ? 0 : perf.actual_power_w;
  const expectedPower = perf?.expected_power_w || 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button 
          onClick={() => navigate('/panels')}
          className="p-2 hover:bg-border/20 rounded transition-colors text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-large font-display font-semibold text-text leading-tight">{panel.name}</h2>
            <StatusBadge status={displayStatus} />
          </div>
          <span className="text-small text-text-muted">
            {site?.name || `Site ${panel.site_id}`} • Rated Power: {panel.rated_power_w} W
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0 mb-4">
        
        {/* Panel Config */}
        <div className="p-4 border border-border bg-surface rounded shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-primary" />
            <h3 className="text-small font-semibold text-text uppercase tracking-wider">Configuration</h3>
          </div>
          <div className="grid grid-cols-2 gap-y-3">
            <div className="flex flex-col">
              <span className="text-small text-text-muted">Technology</span>
              <span className="text-small font-medium text-text">{panel.technology || 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-text-muted">System Losses</span>
              <span className="text-small font-medium text-text">{panel.system_losses}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-text-muted">Tilt</span>
              <span className="text-small font-medium text-text">{panel.tilt ? `${panel.tilt}°` : 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-text-muted">Azimuth</span>
              <span className="text-small font-medium text-text">{panel.azimuth ? `${panel.azimuth}°` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Device Status */}
        <div className="p-4 border border-border bg-surface rounded shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-small font-semibold text-text uppercase tracking-wider">IoT Device</h3>
          </div>
          {device ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-small text-text-muted">Status</span>
                <StatusBadge status={device.is_online ? 'ONLINE' : 'OFFLINE'} />
              </div>
              <div className="flex flex-col">
                <span className="text-small text-text-muted">Device UID</span>
                <span className="text-small font-medium text-text font-mono">{device.device_uid}</span>
              </div>
              <div className="flex justify-between">
                <div className="flex flex-col">
                  <span className="text-small text-text-muted">Type</span>
                  <span className="text-small font-medium text-text">{device.device_type || 'Unknown'}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-small text-text-muted">Firmware</span>
                  <span className="text-small font-medium text-text">{device.firmware_version || 'N/A'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-small text-text-muted">No associated device</span>
            </div>
          )}
        </div>

        {/* Performance Visualization */}
        <div className="min-h-[160px]">
          <PerformanceVisualization 
            currentPower={actualPower} 
            expectedPower={expectedPower} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0 mb-4">
        {/* Diagnostics & Weather */}
        <div className="p-4 border border-border bg-surface rounded shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-status-warning" />
            <h3 className="text-small font-semibold text-text uppercase tracking-wider">Diagnostics</h3>
          </div>
          
          {diag?.reason && (
            <div className="p-3 bg-border/20 border border-border rounded text-small text-text">
              <span className="font-semibold block mb-1">Diagnostic Reason:</span>
              {diag.reason}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-small text-text-muted">LDR (Light)</span>
              <span className="text-small font-medium text-text">{diag?.light_intensity != null ? diag.light_intensity.toFixed(0) : 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-text-muted">LDR Base</span>
              <span className="text-small font-medium text-text">{diag?.light_baseline != null ? diag.light_baseline.toFixed(0) : 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-text-muted">Temp</span>
              <span className="text-small font-medium text-text">{diag?.temperature != null ? `${diag.temperature}°C` : 'N/A'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-small text-text-muted">Clouds</span>
              <span className="text-small font-medium text-text">{diag?.cloud_cover != null ? `${diag.cloud_cover}%` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Alerts History */}
        <div className="p-4 border border-border bg-surface rounded shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-error" />
              <h3 className="text-small font-semibold text-text uppercase tracking-wider">Recent Alerts</h3>
            </div>
            <span className="text-small font-medium bg-border px-2 rounded-full text-text-muted">
              {alerts.length}
            </span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px] pr-1">
            {alerts.length === 0 ? (
              <div className="text-small text-text-muted flex items-center justify-center h-20 bg-border/20 rounded">
                No recent alerts
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="flex flex-col p-2 border border-border/50 bg-background rounded">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-small font-semibold text-status-error">{alert.fault_type}</span>
                    <span className="text-[10px] text-text-muted font-mono">{new Date(alert.first_detected_at).toLocaleString()}</span>
                  </div>
                  <span className="text-small text-text-muted leading-tight">{alert.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default PanelDetails;
