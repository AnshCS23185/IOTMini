import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPanelDiagnostic, getPanelDiagnosticHistory, runPanelDiagnostic } from '../../api/diagnostics';
import { getPanel, getPanelDevice } from '../../api/panels';
import { getDeviceStatus } from '../../api/iot';
import { Loader2, ArrowLeft, Activity, Info, Zap, Thermometer, Cloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const PanelDiagnosticDetail = () => {
  const { panelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [runningDiag, setRunningDiag] = useState(false);
  const [error, setError] = useState(null);

  const [panel, setPanel] = useState(null);
  const [currentDiag, setCurrentDiag] = useState(null);
  const [history, setHistory] = useState([]);
  const [device, setDevice] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const pId = Number(panelId);

      const panelData = await getPanel(pId);
      setPanel(panelData);

      const [diagData, histData, devData] = await Promise.allSettled([
        getPanelDiagnostic(pId),
        getPanelDiagnosticHistory(pId),
        getPanelDevice(pId)
      ]);

      if (diagData.status === 'fulfilled') setCurrentDiag(diagData.value);
      if (histData.status === 'fulfilled') setHistory(histData.value || []);
      
      if (devData.status === 'fulfilled' && devData.value?.device_uid) {
        try {
          const devStatus = await getDeviceStatus(devData.value.device_uid);
          setDevice({ ...devData.value, ...devStatus });
        } catch (e) {
          setDevice({ ...devData.value, is_online: false, device_status: 'UNKNOWN' });
        }
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load panel diagnostic details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [panelId]);

  const handleRunDiagnostic = async () => {
    if (runningDiag) return;
    try {
      setRunningDiag(true);
      const res = await runPanelDiagnostic(Number(panelId));
      setCurrentDiag(res);
      // Prepend to history
      setHistory(prev => [res, ...prev]);
    } catch (err) {
      alert("Failed to run diagnostic manually.");
    } finally {
      setRunningDiag(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-txt-muted text-body">Loading panel diagnostics...</span>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-error text-body font-semibold">{error || 'Panel not found'}</span>
        <Button variant="outline" onClick={() => navigate('/diagnostics')}>Back to Diagnostics</Button>
      </div>
    );
  }

  const isNighttime = currentDiag?.expected_power_w === 0;
  const isNoData = !currentDiag || currentDiag.actual_power_w == null;
  const status = currentDiag?.status || 'NO_DATA';

  const confScore = currentDiag?.diagnostic_confidence != null ? (currentDiag.diagnostic_confidence * 100).toFixed(0) : null;
  const reason = currentDiag?.reason || (status === 'NO_SOLAR' ? 'Normal nighttime condition' : 'No diagnostic reason available');

  const canRunDiagnostic = user?.role === 'ADMIN' || user?.role === 'USER';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 shrink-0">
        <button 
          onClick={() => navigate('/diagnostics')}
          className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-txt-muted hover:text-txt cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-txt" />
        </button>
        <div className="flex justify-between items-center w-full">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-bold text-txt leading-tight">{panel.name} Diagnostic Detail</h1>
              <StatusBadge status={status} />
            </div>
            <span className="text-[13px] text-txt-muted mt-0.5 font-normal">
              Site ID: {panel.site_id}
            </span>
          </div>
          
          <div className="flex gap-2.5">
            <Button variant="outline" size="medium" onClick={() => navigate(`/panels/${panel.id}`)}>View Panel Metrics</Button>
            {canRunDiagnostic && (
              <Button variant="primary" size="medium" onClick={handleRunDiagnostic} disabled={runningDiag} className="w-36">
                {runningDiag ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Run Diagnostic'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 shrink-0">
        
        {/* Core State */}
        <div className="lg:col-span-2 border border-border bg-surface rounded flex flex-col p-4 shadow-sm">
           <div className="flex items-center gap-2 mb-3">
             <Activity className="h-5 w-5 text-primary" />
             <h3 className="text-body font-semibold text-txt uppercase tracking-wider">Diagnostic Evaluation</h3>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
             <div className="flex flex-col">
               <span className="text-small text-txt-muted">Status</span>
               <div className="mt-1"><StatusBadge status={status} /></div>
             </div>
             <div className="flex flex-col">
               <span className="text-small text-txt-muted">Confidence</span>
               <span className="text-section font-sans text-txt">{confScore ? `${confScore}%` : 'N/A'}</span>
             </div>
             <div className="flex flex-col">
               <span className="text-small text-txt-muted">Performance</span>
               <span className="text-section font-sans text-txt">
                 {(isNighttime || isNoData || currentDiag?.performance_percentage == null) ? 'N/A' : `${currentDiag.performance_percentage.toFixed(1)}%`}
               </span>
             </div>
             <div className="flex flex-col">
               <span className="text-small text-txt-muted">Last Evaluated</span>
               <span className="text-small font-mono text-txt mt-1 leading-tight">
                 {currentDiag ? new Date(currentDiag.timestamp).toLocaleString() : 'Never'}
               </span>
             </div>
           </div>

           <div className="p-3 bg-surface-hover border border-border rounded text-small text-txt">
             <span className="font-semibold block mb-1 text-txt-muted">Reason:</span>
             {reason}
           </div>
        </div>

        {/* LDR & Device Context */}
        <div className="border border-border bg-surface rounded flex flex-col p-4 shadow-sm gap-4">
           {/* Device Context */}
           <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2 mb-1">
               <Info className="h-4 w-4 text-primary" />
               <h3 className="text-small font-semibold text-txt uppercase tracking-wider">Device Context</h3>
             </div>
             {device ? (
               <>
                 <div className="flex justify-between text-small border-b border-border/50 pb-1">
                   <span className="text-txt-muted">Status</span>
                   <StatusBadge status={device.is_online ? 'ONLINE' : 'OFFLINE'} />
                 </div>
                 <div className="flex justify-between text-small border-b border-border/50 pb-1">
                   <span className="text-txt-muted">UID</span>
                   <span className="font-mono text-txt">{device.device_uid}</span>
                 </div>
               </>
             ) : (
               <span className="text-small text-txt-muted">No associated device</span>
             )}
           </div>

           {/* LDR Context */}
           <div className="flex flex-col gap-2 mt-2">
             <div className="flex items-center gap-2 mb-1">
               <Zap className="h-4 w-4 text-warning" />
               <h3 className="text-small font-semibold text-txt uppercase tracking-wider">LDR Context</h3>
             </div>
             <div className="flex justify-between text-small border-b border-border/50 pb-1">
               <span className="text-txt-muted">Intensity</span>
               <span className="font-mono text-txt">{currentDiag?.light_intensity?.toFixed(0) ?? 'N/A'}</span>
             </div>
             <div className="flex justify-between text-small border-b border-border/50 pb-1">
               <span className="text-txt-muted">Baseline</span>
               <span className="font-mono text-txt">{currentDiag?.light_baseline?.toFixed(0) ?? 'N/A'}</span>
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 flex-1">
        
        {/* History Table */}
        <div className="lg:col-span-2 border border-border bg-surface rounded flex flex-col shadow-sm min-h-0">
           <div className="px-4 py-3 border-b border-border bg-surface-hover shrink-0">
             <span className="text-small font-semibold text-txt uppercase tracking-wider">Diagnostic History</span>
           </div>
           
           <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface shadow-sm z-10">
                  <tr className="text-txt-muted text-caption uppercase tracking-wider">
                    <th className="py-2 px-4 font-medium border-b border-border">Time</th>
                    <th className="py-2 px-4 font-medium border-b border-border">Status</th>
                    <th className="py-2 px-4 font-medium border-b border-border text-right">Perf %</th>
                    <th className="py-2 px-4 font-medium border-b border-border text-right">Conf</th>
                    <th className="py-2 px-4 font-medium border-b border-border">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, i) => {
                    const dt = new Date(row.timestamp);
                    const isRowNight = row.expected_power_w === 0;
                    
                    let pDisplay = 'N/A';
                    if (row.performance_percentage != null && !isRowNight) {
                      pDisplay = row.performance_percentage.toFixed(0) + '%';
                    }
                    const cDisplay = row.diagnostic_confidence != null ? (row.diagnostic_confidence * 100).toFixed(0) + '%' : 'N/A';
                    
                    return (
                      <tr key={i} className="border-b border-border/30 hover:bg-surface-hover/10 text-caption">
                        <td className="py-2 px-4 text-txt font-mono whitespace-nowrap">{dt.toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                        <td className="py-2 px-4"><span className="text-caption font-bold text-txt-muted">{row.status}</span></td>
                        <td className="py-2 px-4 text-txt text-right font-mono">{pDisplay}</td>
                        <td className="py-2 px-4 text-txt text-right font-mono">{cDisplay}</td>
                        <td className="py-2 px-4 text-txt-muted truncate max-w-[150px]" title={row.reason || ''}>{row.reason || '-'}</td>
                      </tr>
                    );
                  })}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-txt-muted text-small">No diagnostic history available</td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>

        {/* Environmental Context */}
        <div className="border border-border bg-surface rounded flex flex-col p-4 shadow-sm gap-4 shrink-0 h-fit">
           <div className="flex items-center gap-2 mb-1">
             <Cloud className="h-4 w-4 text-info" />
             <h3 className="text-small font-semibold text-txt uppercase tracking-wider">Environmental Context</h3>
           </div>
           
           <div className="flex flex-col gap-3">
             <div className="flex justify-between text-small border-b border-border/50 pb-1">
               <span className="text-txt-muted">Temperature</span>
               <span className="font-mono text-txt">{currentDiag?.temperature != null ? `${currentDiag.temperature}°C` : 'N/A'}</span>
             </div>
             <div className="flex justify-between text-small border-b border-border/50 pb-1">
               <span className="text-txt-muted">Humidity</span>
               <span className="font-mono text-txt">{currentDiag?.humidity != null ? `${currentDiag.humidity}%` : 'N/A'}</span>
             </div>
             <div className="flex justify-between text-small border-b border-border/50 pb-1">
               <span className="text-txt-muted">Cloud Cover</span>
               <span className="font-mono text-txt">{currentDiag?.cloud_cover != null ? `${currentDiag.cloud_cover}%` : 'N/A'}</span>
             </div>
             <div className="flex justify-between text-small border-b border-border/50 pb-1">
               <span className="text-txt-muted">Precipitation</span>
               <span className="font-mono text-txt">{currentDiag?.precipitation != null ? `${currentDiag.precipitation}mm` : 'N/A'}</span>
             </div>
           </div>

           <div className="flex items-center gap-2 mb-1 mt-4">
             <Thermometer className="h-4 w-4 text-error" />
             <h3 className="text-small font-semibold text-txt uppercase tracking-wider">Power Context</h3>
           </div>
           
           <div className="flex flex-col gap-3">
             <div className="flex justify-between text-small border-b border-border/50 pb-1">
               <span className="text-txt-muted">Actual Power</span>
               <span className="font-mono text-txt">{currentDiag?.actual_power_w != null ? `${currentDiag.actual_power_w.toFixed(1)}W` : 'N/A'}</span>
             </div>
             <div className="flex justify-between text-small border-b border-border/50 pb-1">
               <span className="text-txt-muted">Expected Power</span>
               <span className="font-mono text-txt">{currentDiag?.expected_power_w != null ? `${currentDiag.expected_power_w.toFixed(1)}W` : '0W'}</span>
             </div>
           </div>
        </div>
        
      </div>
      
    </div>
  );
};

export default PanelDiagnosticDetail;
