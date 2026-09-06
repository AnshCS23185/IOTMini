import React, { useState, useEffect } from 'react';
import { getSites } from '../../api/sites';
import { getSiteAlerts } from '../../api/alerts';
import { getSitePanels } from '../../api/panels';
import { Filter, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

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

const Alerts = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  
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
      
      let effectiveSiteId = selectedSiteId;
      if (!isAdmin && sitesList.length > 0) {
        effectiveSiteId = sitesList[0].id.toString();
      }

      for (const site of sitesList) {
        if (effectiveSiteId !== 'ALL' && effectiveSiteId !== site.id.toString()) continue;
        
        try {
          const panels = await getSitePanels(site.id);
          const panelMap = {};
          panels.forEach(p => panelMap[p.id] = p.name);

          const active = await getSiteAlerts(site.id, true);
          active.forEach(a => allActive.push({ ...a, panelName: panelMap[a.panel_id] || `P${a.panel_id}`, siteName: site.name }));

          const all = await getSiteAlerts(site.id, false);
          const resolved = all.filter(a => a.status === 'RESOLVED');
          resolved.forEach(a => allResolved.push({ ...a, panelName: panelMap[a.panel_id] || `P${a.panel_id}`, siteName: site.name }));
        } catch (e) {
          console.error(`Failed alerts for site ${site.id}`, e);
        }
      }

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
      <div className="flex flex-col items-center justify-center h-full w-full gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Loading alerts...</span>
      </div>
    );
  }

  if (error && activeAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-3">
        <AlertTriangle className="h-6 w-6 text-error" />
        <span className="text-small text-error font-medium">{error}</span>
        <Button variant="outline" size="small" onClick={fetchAlerts}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="page-container gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-1 gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-txt leading-tight tracking-tight">Alerts & Incidents</h1>
          <p className="text-[13px] sm:text-[14px] text-txt-muted mt-0.5 font-normal">Active faults, telemetry anomalies, and resolution logs.</p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px]">
              <Filter className="h-4 w-4 text-txt-muted mr-2" />
              <select 
                className="bg-transparent text-small text-txt font-medium focus:outline-none cursor-pointer"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
              >
                <option value="ALL" className="bg-surface text-txt">All Sites</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id} className="bg-surface text-txt">{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px]">
            <Filter className="h-4 w-4 text-txt-muted mr-2" />
            <select 
              className="bg-transparent text-small text-txt font-medium focus:outline-none cursor-pointer"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL" className="bg-surface text-txt">All Severities</option>
              <option value="INFO" className="bg-surface text-txt">INFO</option>
              <option value="WARNING" className="bg-surface text-txt">WARNING</option>
              <option value="CRITICAL" className="bg-surface text-txt">CRITICAL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
        {/* Active Alerts */}
        <div className="card p-0 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-border bg-surface-secondary flex items-center justify-between">
            <span className="text-caption font-semibold text-txt uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Active Alerts ({filteredActive.length})
            </span>
          </div>
          
          <div className="p-3">
            {filteredActive.length === 0 ? (
              <div className="text-txt-muted text-caption p-4 text-center">
                No active alerts matching criteria.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredActive.map(alert => (
                  <div key={alert.id} className="py-2.5 px-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 hover:bg-surface-hover/30 rounded transition-colors">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-caption font-semibold text-txt">{alert.panelName}</span>
                        <span className="text-caption text-txt-muted">•</span>
                        <span className="text-caption text-txt-muted">{alert.siteName}</span>
                        <span className="text-caption text-txt-muted">•</span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-txt-muted">{alert.fault_type}</span>
                      </div>
                      <span className="text-caption text-txt font-medium">{alert.message}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      {alert.consecutive_count > 1 && (
                        <span className="text-[10px] font-medium text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded">
                          {alert.consecutive_count}x readings
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[11px] text-txt-muted font-mono">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(alert.created_at).toLocaleDateString([], {month:'short', day:'numeric'})} {new Date(alert.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resolved Alerts */}
        <div className="card p-0 flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-surface-secondary flex items-center justify-between">
            <span className="text-caption font-semibold text-txt uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-txt-muted" /> Resolved Alerts Log ({filteredResolved.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            {filteredResolved.length === 0 ? (
              <div className="text-txt-muted text-caption p-4 text-center">
                No resolved alerts.
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="table-header">
                  <tr>
                    <th className="py-2 px-3">Severity</th>
                    <th className="py-2 px-3">Site / Panel</th>
                    <th className="py-2 px-3">Fault Type</th>
                    <th className="py-2 px-3">Detected</th>
                    <th className="py-2 px-3 text-right">Resolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredResolved.map(alert => (
                    <tr key={alert.id} className="table-row text-caption">
                      <td className="table-cell">
                        <SeverityBadge severity={alert.severity} />
                      </td>
                      <td className="table-cell font-medium text-txt">
                        {alert.siteName} <span className="text-txt-muted font-normal">/ {alert.panelName}</span>
                      </td>
                      <td className="table-cell-muted font-mono">{alert.fault_type}</td>
                      <td className="table-cell-muted font-mono text-[11px]">{new Date(alert.created_at).toLocaleString()}</td>
                      <td className="table-cell-muted font-mono text-[11px] text-right">{new Date(alert.updated_at).toLocaleString()}</td>
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

export default Alerts;
