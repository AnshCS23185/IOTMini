import React, { useState, useEffect } from 'react';
import { getSites } from '../../api/sites';
import { getSiteAlerts } from '../../api/alerts';
import { getSitePanels } from '../../api/panels';
import { Loader2, Filter, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const SeverityBadge = ({ severity }) => {
  let colors = 'bg-border/20 text-text-muted';
  if (severity === 'INFO') colors = 'bg-[#C6C0D0]/20 text-[#C6C0D0] border-[#C6C0D0]/30';
  if (severity === 'WARNING') colors = 'bg-[#D59D80]/20 text-[#D59D80] border-[#D59D80]/30';
  if (severity === 'CRITICAL') colors = 'bg-[#3B2823] text-[#F1C6B3] border-[#F1C6B3]/30'; // High contrast in both modes

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors}`}>
      {severity}
    </span>
  );
};

const Alerts = () => {
  const [sites, setSites] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  
  const [selectedSiteId, setSelectedSiteId] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sitesList = await getSites();
      setSites(sitesList);

      let allActive = [];
      let allResolved = [];

      for (const site of sitesList) {
        if (selectedSiteId !== 'ALL' && selectedSiteId !== site.id.toString()) continue;
        
        try {
          // Fetch panels to map names
          const panels = await getSitePanels(site.id);
          const panelMap = {};
          panels.forEach(p => panelMap[p.id] = p.name);

          // Fetch active alerts
          const active = await getSiteAlerts(site.id, true);
          active.forEach(a => allActive.push({ ...a, panelName: panelMap[a.panel_id] || `P${a.panel_id}`, siteName: site.name }));

          // Fetch resolved alerts (backend doesn't easily let us filter only resolved via query param if active_only=false returns ALL, 
          // so we fetch all and filter client side)
          const all = await getSiteAlerts(site.id, false);
          const resolved = all.filter(a => a.status === 'RESOLVED');
          resolved.forEach(a => allResolved.push({ ...a, panelName: panelMap[a.panel_id] || `P${a.panel_id}`, siteName: site.name }));
        } catch (e) {
          console.error(`Failed alerts for site ${site.id}`, e);
        }
      }

      // Sort by updated_at descending
      allActive.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
      allResolved.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));

      setActiveAlerts(allActive);
      setResolvedAlerts(allResolved);

    } catch (err) {
      console.error(err);
      setError('Unable to load alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedSiteId]);

  const filterList = (list) => {
    return list.filter(item => {
      if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;
      return true;
    });
  };

  const filteredActive = filterList(activeAlerts);
  const filteredResolved = filterList(resolvedAlerts);

  if (loading && activeAlerts.length === 0 && resolvedAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-text-muted text-medium">Loading alert state...</span>
      </div>
    );
  }

  if (error && activeAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-status-error text-medium font-semibold">{error}</span>
        <button onClick={fetchAlerts} className="border border-border px-4 py-2 rounded text-text hover:bg-border/20 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-4 gap-4">
        <div>
          <h2 className="text-large font-display font-semibold text-text leading-tight">Alerts</h2>
          <span className="text-small text-text-muted">Active faults and historical resolutions</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center border border-border bg-surface rounded px-3 py-1.5">
            <Filter className="h-4 w-4 text-text-muted mr-2" />
            <select 
              className="bg-transparent text-small text-text font-medium focus:outline-none cursor-pointer"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="ALL" className="bg-surface">All Sites</option>
              {sites.map(s => (
                <option key={s.id} value={s.id} className="bg-surface">{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center border border-border bg-surface rounded px-3 py-1.5">
            <Filter className="h-4 w-4 text-text-muted mr-2" />
            <select 
              className="bg-transparent text-small text-text font-medium focus:outline-none cursor-pointer"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL" className="bg-surface">All Severities</option>
              <option value="INFO" className="bg-surface">INFO</option>
              <option value="WARNING" className="bg-surface">WARNING</option>
              <option value="CRITICAL" className="bg-surface">CRITICAL</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto pr-2 pb-4">
        
        {/* Active Alerts */}
        <div className="flex flex-col gap-3">
           <div className="flex items-center gap-2 border-b border-border pb-2">
             <AlertTriangle className="h-5 w-5 text-status-warning" />
             <h3 className="text-medium font-semibold text-text">Active Alerts ({filteredActive.length})</h3>
           </div>
           
           {filteredActive.length === 0 ? (
             <div className="text-text-muted text-small p-4 border border-border rounded bg-surface text-center">
               No active alerts matching criteria.
             </div>
           ) : (
             <div className="flex flex-col gap-2">
               {filteredActive.map(alert => (
                 <div key={alert.id} className="border border-status-warning/30 bg-status-warning/5 rounded p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
                   <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-3">
                       <SeverityBadge severity={alert.severity} />
                       <span className="text-small font-semibold text-text">{alert.panelName}</span>
                       <span className="text-[11px] text-text-muted uppercase tracking-wide">{alert.fault_type}</span>
                     </div>
                     <span className="text-small text-text">{alert.message}</span>
                   </div>
                   
                   <div className="flex flex-col text-right">
                     <div className="flex items-center justify-end gap-1 text-[11px] text-text-muted font-mono mb-1">
                       <Clock className="h-3 w-3" />
                       <span>Detected: {new Date(alert.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                     </div>
                     {alert.consecutive_count > 1 && (
                       <span className="text-[11px] font-semibold text-status-warning/80 uppercase">
                         {alert.consecutive_count} consecutive readings
                       </span>
                     )}
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* Resolved Alerts */}
        <div className="flex flex-col gap-3 mt-4 opacity-80">
           <div className="flex items-center gap-2 border-b border-border pb-2">
             <CheckCircle className="h-5 w-5 text-status-info" />
             <h3 className="text-medium font-semibold text-text">Resolved Alerts</h3>
           </div>
           
           {filteredResolved.length === 0 ? (
             <div className="text-text-muted text-small p-4 text-center">
               No resolved alerts.
             </div>
           ) : (
             <div className="overflow-x-auto border border-border rounded bg-surface">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-border/20 text-text-muted text-[11px] uppercase tracking-wider">
                     <th className="py-2 px-4 font-medium border-b border-border">Severity</th>
                     <th className="py-2 px-4 font-medium border-b border-border">Panel</th>
                     <th className="py-2 px-4 font-medium border-b border-border">Fault Type</th>
                     <th className="py-2 px-4 font-medium border-b border-border">Detected</th>
                     <th className="py-2 px-4 font-medium border-b border-border text-right">Resolved</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredResolved.map((alert, i) => (
                     <tr key={alert.id} className={`border-b border-border/30 hover:bg-border/10 transition-colors ${i % 2 === 0 ? '' : 'bg-border/5'}`}>
                       <td className="py-2 px-4">
                         <span className="text-[10px] font-bold text-text-muted">{alert.severity}</span>
                       </td>
                       <td className="py-2 px-4 text-small text-text font-semibold">{alert.panelName}</td>
                       <td className="py-2 px-4 text-small text-text-muted">{alert.fault_type}</td>
                       <td className="py-2 px-4 text-[11px] font-mono text-text-muted">{new Date(alert.created_at).toLocaleString()}</td>
                       <td className="py-2 px-4 text-[11px] font-mono text-text-muted text-right">{new Date(alert.updated_at).toLocaleString()}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default Alerts;
