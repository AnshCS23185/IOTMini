import React, { useState, useEffect } from 'react';
import { getSites } from '../../api/sites';
import { getAlertHistory, acknowledgeAlert, resolveAlert } from '../../api/alerts';
import { Filter, CheckCircle, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { AlertDetailDrawer } from './AlertDetailDrawer';
import { AnalyticsTab } from './AnalyticsTab';

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
  
  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE, HISTORY, ANALYTICS
  const [sites, setSites] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Filters for History Tab
  const [filterSiteId, setFilterSiteId] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterAck, setFilterAck] = useState('ALL');
  const [filterDays, setFilterDays] = useState(7);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const sitesList = await getSites();
        setSites(sitesList);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSites();
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (activeTab === 'ANALYTICS') return; // Handled by AnalyticsTab component
      
      setLoading(true);
      try {
        const params = {};
        if (activeTab === 'ACTIVE') {
          params.status = 'ACTIVE';
        } else {
          if (filterStatus !== 'ALL') params.status = filterStatus;
          if (filterSeverity !== 'ALL') params.severity = filterSeverity;
          if (filterAck !== 'ALL') params.ack_state = filterAck;
          if (filterSiteId !== 'ALL') params.site_id = filterSiteId;
          params.days = filterDays;
        }

        const data = await getAlertHistory(params);
        setAlerts(data);
      } catch (e) {
        console.error("Failed to load alerts", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    
    // Auto-refresh active alerts every 30s
    let interval;
    if (activeTab === 'ACTIVE') {
      interval = setInterval(fetchAlerts, 30000);
    }
    return () => clearInterval(interval);
  }, [activeTab, filterSiteId, filterSeverity, filterStatus, filterAck, filterDays]);

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged_at: new Date().toISOString() } : a));
      if (selectedAlert?.id === id) {
        setSelectedAlert(prev => ({ ...prev, acknowledged_at: new Date().toISOString() }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED', resolved_at: new Date().toISOString() } : a));
      if (selectedAlert?.id === id) {
        setSelectedAlert(prev => ({ ...prev, status: 'RESOLVED', resolved_at: new Date().toISOString() }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-bg">
      {/* Header */}
      <div className="p-6 border-b border-border bg-surface shrink-0">
        <h1 className="text-h2 font-bold text-txt">Alert Center</h1>
        <p className="text-small text-txt-muted mt-1">Monitor, investigate, and analyze system alerts.</p>
        
        {/* Tabs */}
        <div className="flex gap-4 mt-6 border-b border-border">
          <button 
            className={`pb-2 px-1 text-small font-semibold transition-colors border-b-2 ${activeTab === 'ACTIVE' ? 'border-primary text-primary' : 'border-transparent text-txt-muted hover:text-txt'}`}
            onClick={() => setActiveTab('ACTIVE')}
          >
            Active Alerts
          </button>
          <button 
            className={`pb-2 px-1 text-small font-semibold transition-colors border-b-2 ${activeTab === 'HISTORY' ? 'border-primary text-primary' : 'border-transparent text-txt-muted hover:text-txt'}`}
            onClick={() => setActiveTab('HISTORY')}
          >
            Alert History
          </button>
          <button 
            className={`pb-2 px-1 text-small font-semibold transition-colors border-b-2 ${activeTab === 'ANALYTICS' ? 'border-primary text-primary' : 'border-transparent text-txt-muted hover:text-txt'}`}
            onClick={() => setActiveTab('ANALYTICS')}
          >
            Analytics & Insights
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'ANALYTICS' ? (
          <AnalyticsTab />
        ) : (
          <div className="space-y-4">
            
            {/* Filters (Only show in History or if admin in Active) */}
            {(activeTab === 'HISTORY' || isAdmin) && (
              <div className="bg-surface border border-border rounded-lg p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-small font-medium text-txt-muted">
                  <Filter className="w-4 h-4" /> Filters:
                </div>
                
                {isAdmin && (
                  <select 
                    className="bg-surface-secondary border border-border rounded-md px-3 py-1.5 text-small text-txt focus:outline-none focus:border-primary"
                    value={filterSiteId}
                    onChange={(e) => setFilterSiteId(e.target.value)}
                  >
                    <option value="ALL">All Sites</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}

                {activeTab === 'HISTORY' && (
                  <>
                    <select 
                      className="bg-surface-secondary border border-border rounded-md px-3 py-1.5 text-small text-txt focus:outline-none focus:border-primary"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>

                    <select 
                      className="bg-surface-secondary border border-border rounded-md px-3 py-1.5 text-small text-txt focus:outline-none focus:border-primary"
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                    >
                      <option value="ALL">All Severities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="WARNING">Warning</option>
                      <option value="INFO">Info</option>
                    </select>

                    <select 
                      className="bg-surface-secondary border border-border rounded-md px-3 py-1.5 text-small text-txt focus:outline-none focus:border-primary"
                      value={filterAck}
                      onChange={(e) => setFilterAck(e.target.value)}
                    >
                      <option value="ALL">Ack State</option>
                      <option value="ACKNOWLEDGED">Acknowledged</option>
                      <option value="UNACKNOWLEDGED">Unacknowledged</option>
                    </select>

                    <select 
                      className="bg-surface-secondary border border-border rounded-md px-3 py-1.5 text-small text-txt focus:outline-none focus:border-primary"
                      value={filterDays}
                      onChange={(e) => setFilterDays(Number(e.target.value))}
                    >
                      <option value={1}>Last 24 Hours</option>
                      <option value={7}>Last 7 Days</option>
                      <option value={30}>Last 30 Days</option>
                    </select>
                  </>
                )}
              </div>
            )}

            {/* List */}
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-20 bg-surface border border-border rounded-xl">
                <ShieldAlert className="w-12 h-12 text-txt-muted/30 mx-auto mb-4" />
                <h3 className="text-h3 font-semibold text-txt mb-2">No alerts found</h3>
                <p className="text-small text-txt-muted">All systems are currently operating normally based on your filters.</p>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-secondary border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-semibold text-txt-muted uppercase tracking-wider">Severity</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-txt-muted uppercase tracking-wider">Fault Type</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-txt-muted uppercase tracking-wider">Panel</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-txt-muted uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-txt-muted uppercase tracking-wider">Detected</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-txt-muted uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {alerts.map(alert => (
                        <tr key={alert.id} className="hover:bg-surface-hover transition-colors group">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <SeverityBadge severity={alert.severity} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[13px] font-semibold text-txt">{alert.fault_type}</div>
                            <div className="text-[11px] text-txt-muted line-clamp-1 max-w-xs">{alert.message}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-[13px] font-medium text-txt">
                            Panel {alert.panel_id}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${alert.status === 'ACTIVE' ? 'bg-error' : 'bg-success'}`} />
                              <span className="text-[12px] font-medium text-txt">{alert.status}</span>
                            </div>
                            {alert.status === 'ACTIVE' && !alert.acknowledged_at && (
                              <div className="text-[10px] text-info font-medium mt-0.5">Unacknowledged</div>
                            )}
                            {alert.acknowledged_at && (
                              <div className="text-[10px] text-txt-muted font-medium mt-0.5">Acknowledged</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-[12px] text-txt-muted font-mono">
                            {new Date(alert.first_detected_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                            {alert.status === 'ACTIVE' && !alert.acknowledged_at && (
                              <Button variant="outline" size="sm" onClick={() => handleAcknowledge(alert.id)}>Ack</Button>
                            )}
                            <Button variant="primary" size="sm" onClick={() => setSelectedAlert(alert)}>Details</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDetailDrawer 
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
      />
    </div>
  );
};

export default Alerts;
