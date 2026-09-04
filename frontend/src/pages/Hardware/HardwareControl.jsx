import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSites } from '../../api/sites';
import { getSitePanels, getPanelDevice } from '../../api/panels';
import { getDeviceStatus } from '../../api/iot';
import { getPanelCommands, sendPanelCommand } from '../../api/hardware';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Loader2, Zap, AlertTriangle, Clock, History, Cpu, Power } from 'lucide-react';
import { Button } from '../../components/ui/Button';

// Utility for timestamp formatting
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'N/A';
  const now = new Date();
  const ts = new Date(timestamp);
  const diffSecs = Math.floor((now - ts) / 1000);
  
  if (diffSecs < 60) return `${diffSecs} sec ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return ts.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
};

const CommandStatusBadge = ({ status }) => {
  let colors = 'bg-surface-secondary text-txt-muted border-border';
  if (status === 'PENDING') colors = 'bg-amber-500/15 text-amber-600 dark:text-[#FBBF24] border-amber-500/25';
  if (status === 'ACKNOWLEDGED') colors = 'bg-green-500/15 text-green-600 dark:text-[#4ADE80] border-green-500/25';
  if (status === 'FAILED') colors = 'bg-red-500/15 text-red-600 dark:text-[#F87171] border-red-500/25'; 
  
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors}`}>
      {status}
    </span>
  );
};

const HardwareControl = () => {
  const { user } = useAuth();
  const canControl = ['ADMIN', 'USER'].includes(user?.role?.toUpperCase());

  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const [panels, setPanels] = useState([]);
  const [selectedPanelId, setSelectedPanelId] = useState('');
  
  // Context state
  const [deviceContext, setDeviceContext] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  
  const [loadingContext, setLoadingContext] = useState(false);
  const [errorContext, setErrorContext] = useState(null);

  // Command state
  const [reason, setReason] = useState('');
  const [confirmingAction, setConfirmingAction] = useState(null); // 'RELAY_ON' or 'RELAY_OFF'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const fetchPanels = async () => {
      try {
        const sites = await getSites();
        let allPanels = [];
        for (const s of sites) {
          try {
             const sitePanels = await getSitePanels(s.id);
             allPanels = [...allPanels, ...sitePanels.map(p => ({ ...p, siteName: s.name }))];
          } catch (e) {
             console.error(`Failed to load panels for site ${s.id}`);
          }
        }
        setPanels(allPanels);
        if (allPanels.length > 0) {
          setSelectedPanelId(allPanels[0].id.toString());
        }
      } catch (err) {
        console.error('Failed to init hardware control');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchPanels();
  }, []);

  const loadPanelContext = async (pId) => {
    if (!pId) return;
    setLoadingContext(true);
    setErrorContext(null);
    setDeviceContext(null);
    setDeviceStatus(null);
    setCommandHistory([]);
    setConfirmingAction(null);
    setReason('');
    setSubmitError(null);

    try {
      const dev = await getPanelDevice(pId);
      setDeviceContext(dev);
      
      try {
        const stat = await getDeviceStatus(dev.device_uid);
        setDeviceStatus(stat);
      } catch (e) {
        setDeviceStatus({ is_online: false, last_seen: null });
      }

      await refreshHistory(pId);
      
    } catch (err) {
      setErrorContext('No IoT device associated with this panel.');
    } finally {
      setLoadingContext(false);
    }
  };

  const refreshHistory = async (pId) => {
    try {
      const history = await getPanelCommands(pId);
      setCommandHistory(history);
    } catch (e) {
      console.error('Failed to load command history');
    }
  };

  useEffect(() => {
    loadPanelContext(selectedPanelId);
  }, [selectedPanelId]);

  const handleCommandRequest = (command) => {
    setSubmitError(null);
    setConfirmingAction(command);
  };

  const handleConfirmSubmit = async () => {
    if (!selectedPanelId || !confirmingAction) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      await sendPanelCommand(selectedPanelId, confirmingAction, reason);
      
      // Cleanup
      setConfirmingAction(null);
      setReason('');
      
      // Refresh history immediately
      await refreshHistory(selectedPanelId);
    } catch (err) {
      if (err.status === 403) {
        setSubmitError('You do not have permission to control this hardware.');
      } else {
        setSubmitError(err.message || 'Failed to submit command. Verify backend connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-txt-muted text-body">Loading hardware context...</span>
      </div>
    );
  }

  const selectedPanelObj = panels.find(p => p.id.toString() === selectedPanelId);
  const isOnline = deviceStatus?.is_online;
  const hasPending = commandHistory.some(c => c.status === 'PENDING');

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col mb-5 shrink-0">
        <h1 className="text-[26px] sm:text-[28px] font-bold text-txt leading-tight tracking-tight">Hardware Control</h1>
        <p className="text-[13px] sm:text-[14px] text-txt-muted mt-0.5 font-normal">Solar panel relay management and command dispatch.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* Left Column: Context & Controls */}
        <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
          
          {/* Panel Selection */}
          <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col gap-2">
             <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Target Panel</span>
             <select 
                className="input-base cursor-pointer w-full"
                value={selectedPanelId}
                onChange={(e) => setSelectedPanelId(e.target.value)}
              >
                {panels.map(p => (
                  <option key={p.id} value={p.id}>
                    P{p.id.toString().padStart(2, '0')} — {p.siteName}
                  </option>
                ))}
              </select>
          </div>

          {loadingContext ? (
             <div className="border border-border bg-surface rounded p-6 flex items-center justify-center">
               <Loader2 className="h-6 w-6 animate-spin text-primary" />
             </div>
          ) : errorContext ? (
             <div className="border border-border bg-surface rounded p-4 text-center">
               <span className="text-txt-muted text-small">{errorContext}</span>
             </div>
          ) : deviceContext && deviceStatus ? (
             <>
               {/* Device Context */}
               <div className="border border-border bg-surface rounded p-4 flex flex-col gap-3">
                 <div className="flex items-center gap-2 mb-1">
                   <Cpu className="h-4 w-4 text-primary" />
                   <span className="text-small font-semibold text-txt uppercase tracking-wider">Device Context</span>
                 </div>
                 
                 <div className="flex justify-between items-center text-small border-b border-border/50 pb-2">
                   <span className="text-txt-muted">UID</span>
                   <span className="font-mono text-txt font-semibold">{deviceContext.device_uid}</span>
                 </div>
                 <div className="flex justify-between items-center text-small border-b border-border/50 pb-2">
                   <span className="text-txt-muted">Type</span>
                   <span className="font-mono text-txt-muted">{deviceContext.device_type}</span>
                 </div>
                 <div className="flex justify-between items-center text-small border-b border-border/50 pb-2">
                   <span className="text-txt-muted">Status</span>
                   <StatusBadge status={isOnline ? 'ONLINE' : 'OFFLINE'} />
                 </div>
                 <div className="flex justify-between items-center text-small border-b border-border/50 pb-2">
                   <span className="text-txt-muted">Last Seen</span>
                   <span className="font-mono text-txt-muted">{formatTimeAgo(deviceStatus.last_seen)}</span>
                 </div>
                 
                 {!isOnline && (
                   <div className="mt-2 bg-warning/10 border border-status-warning/30 p-3 rounded flex gap-3 items-start">
                     <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                     <p className="text-caption text-txt-muted leading-tight">
                       <span className="text-warning font-semibold block mb-1">DEVICE IS OFFLINE</span>
                       Hardware commands may be queued by the backend but will likely fail or time out awaiting physical acknowledgement.
                     </p>
                   </div>
                 )}
               </div>

                {/* Relay Controls */}
                <div className="border border-border bg-surface rounded-lg flex flex-col">
                  <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Power className="h-4 w-4 text-primary" />
                      <span className="text-caption font-semibold text-txt uppercase tracking-wider">Relay Control</span>
                    </div>
                    {!canControl && <span className="text-caption bg-surface-secondary text-txt-muted px-2 py-0.5 rounded uppercase font-bold">Read Only</span>}
                  </div>
                  
                  <div className="p-3.5 flex flex-col gap-3">
                    
                    {hasPending && (
                      <div className="bg-amber-500/10 border border-amber-500/25 p-2.5 rounded-lg flex flex-col gap-0.5">
                        <span className="text-[#FBBF24] font-bold text-caption uppercase tracking-wider">Warning</span>
                        <span className="text-small text-txt">A command is currently <strong className="text-[#FBBF24]">PENDING</strong> for this panel.</span>
                      </div>
                    )}
                    
                    {!confirmingAction ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-caption text-txt-muted font-semibold uppercase tracking-wider">Command Reason</span>
                          <input 
                            type="text" 
                            placeholder="e.g. Scheduled maintenance inspection..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={!canControl}
                            className="input-base w-full disabled:opacity-40"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2.5 mt-1">
                          <Button 
                            variant="outline" 
                            size="medium"
                            className="w-full border-green-500/30 text-green-500 dark:text-[#4ADE80] hover:bg-green-500/10 font-medium cursor-pointer"
                            disabled={!canControl || isSubmitting}
                            onClick={() => handleCommandRequest('RELAY_ON')}
                          >
                            RELAY ON
                          </Button>
                          <Button 
                            variant="outline"
                            size="medium"
                            className="w-full border-red-500/30 text-red-500 dark:text-[#F87171] hover:bg-red-500/10 font-medium cursor-pointer"
                            disabled={!canControl || isSubmitting}
                            onClick={() => handleCommandRequest('RELAY_OFF')}
                          >
                            RELAY OFF
                          </Button>
                        </div>
                        
                        {submitError && (
                          <div className="text-caption text-error bg-error/10 p-2 rounded border border-error/20">
                            {submitError}
                          </div>
                        )}
                      </div>
                   ) : (
                     <div className="flex flex-col gap-4 bg-background p-4 border border-primary/30 rounded">
                       <div className="flex flex-col gap-1">
                         <span className="text-body font-bold text-txt">Turn relay {confirmingAction === 'RELAY_ON' ? 'ON' : 'OFF'}?</span>
                         <span className="text-caption text-txt-muted">Targeting {selectedPanelObj?.name} ({deviceContext.device_uid})</span>
                       </div>
                       
                       <div className="text-small bg-surface p-2 rounded border border-border">
                         <span className="text-txt-muted block text-caption uppercase font-bold mb-1">Reason:</span>
                         <span className="text-txt">{reason || <span className="italic text-txt-muted opacity-50">No reason provided</span>}</span>
                       </div>
                       
                       <div className="flex items-center gap-2 mt-2">
                         <Button 
                           variant="outline" 
                           onClick={() => setConfirmingAction(null)}
                           disabled={isSubmitting}
                           className="flex-1"
                         >
                           Cancel
                         </Button>
                         <Button 
                           variant="primary" 
                           onClick={handleConfirmSubmit}
                           disabled={isSubmitting}
                           className={`flex-1 ${confirmingAction === 'RELAY_ON' ? 'bg-info hover:bg-info/80 text-background' : 'bg-error hover:bg-error/80 text-background'}`}
                         >
                           {isSubmitting ? (
                             <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending...</span>
                           ) : (
                             `Confirm ${confirmingAction === 'RELAY_ON' ? 'ON' : 'OFF'}`
                           )}
                         </Button>
                       </div>
                     </div>
                   )}
                   
                 </div>
               </div>
             </>
          ) : null}
        </div>

        {/* Right Column: Command History */}
        <div className="flex-1 flex flex-col min-h-0 border border-border bg-surface rounded overflow-hidden shadow-sm">
           <div className="px-4 py-3 border-b border-border bg-surface-hover shrink-0 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <History className="h-4 w-4 text-txt-muted" />
               <span className="text-small font-semibold text-txt uppercase tracking-wider">Command History</span>
             </div>
             {deviceContext && (
               <button 
                 onClick={() => refreshHistory(selectedPanelId)}
                 className="text-caption font-bold uppercase text-txt-muted hover:text-txt transition-colors"
               >
                 Refresh
               </button>
             )}
           </div>
           
           <div className="flex-1 min-h-0 overflow-y-auto">
             {!deviceContext ? (
               <div className="p-8 text-center text-txt-muted text-small">
                 Select a panel to view hardware history.
               </div>
             ) : commandHistory.length === 0 ? (
               <div className="p-8 text-center text-txt-muted text-small">
                 No hardware commands recorded for this panel.
               </div>
             ) : (
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-border/10 text-txt-muted text-caption uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                     <th className="py-2 px-4 font-medium border-b border-border">Time</th>
                     <th className="py-2 px-4 font-medium border-b border-border text-center">Command</th>
                     <th className="py-2 px-4 font-medium border-b border-border text-center">Status</th>
                     <th className="py-2 px-4 font-medium border-b border-border">Reason</th>
                     <th className="py-2 px-4 font-medium border-b border-border text-right">Requested By</th>
                   </tr>
                 </thead>
                 <tbody>
                   {commandHistory.map((cmd, i) => (
                     <tr key={cmd.id} className={`border-b border-border/30 hover:bg-surface-hover/10 transition-colors ${i % 2 === 0 ? '' : 'bg-border/5'}`}>
                       <td className="py-3 px-4">
                         <div className="flex flex-col gap-0.5">
                           <span className="text-caption font-mono text-txt">{new Date(cmd.requested_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           <span className="text-caption text-txt-muted">{new Date(cmd.requested_at).toLocaleDateString()}</span>
                         </div>
                       </td>
                       <td className="py-3 px-4 text-center">
                         <span className={`text-caption font-bold uppercase font-mono ${cmd.command === 'RELAY_ON' ? 'text-info' : 'text-error'}`}>
                           {cmd.command}
                         </span>
                       </td>
                       <td className="py-3 px-4 text-center">
                         <CommandStatusBadge status={cmd.status} />
                         {cmd.status === 'ACKNOWLEDGED' && cmd.acknowledged_at && (
                           <span className="block text-caption text-txt-muted mt-1 font-mono">
                             @ {new Date(cmd.acknowledged_at).toLocaleTimeString()}
                           </span>
                         )}
                       </td>
                       <td className="py-3 px-4 text-small text-txt-muted truncate max-w-[200px]" title={cmd.reason}>
                         {cmd.reason || '—'}
                       </td>
                       <td className="py-3 px-4 text-caption text-txt-muted text-right truncate max-w-[150px]" title={cmd.requested_by?.email}>
                         {cmd.requested_by?.email || 'System'}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default HardwareControl;
