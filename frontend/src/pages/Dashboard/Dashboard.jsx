import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { getDashboard, getAlerts } from '../../api/dashboard';
import { getOrganizations } from '../../api/admin';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { 
  Loader2, Users, Monitor, 
  AlertTriangle, Zap, Building, 
  CheckCircle2, Activity, Check
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [organizations, setOrganizations] = useState([]);
  const [sites, setSites] = useState([]);
  const [siteDataMap, setSiteDataMap] = useState({});

  const fetchPlatformData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      
      const [orgs, fetchedSites] = await Promise.all([
        getOrganizations().catch(() => []),
        getSites()
      ]);
      
      setOrganizations(orgs);
      setSites(fetchedSites);

      const dataMap = {};
      const promises = fetchedSites.map(async (site) => {
        try {
          const [dash, activeAlerts] = await Promise.all([
            getDashboard(site.id),
            getAlerts(site.id)
          ]);
          dataMap[site.id] = { dashboard: dash, alerts: activeAlerts };
        } catch (e) {
          dataMap[site.id] = { dashboard: null, alerts: [] };
        }
      });

      await Promise.all(promises);
      setSiteDataMap(dataMap);
    } catch (err) {
      if (!silent) setError('Unable to load platform dashboard data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData(false);
    const timer = setInterval(() => {
      fetchPlatformData(true);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const totalClients = organizations.length;
  const totalSites = sites.length;
  let totalPanels = 0;
  let totalDevices = 0;
  let currentOutput = 0;
  let expectedOutput = 0;
  let totalAlerts = 0;
  
  let healthySites = 0;
  let attentionSites = 0;
  let offlineSites = 0;

  const alertsList = [];
  const attentionList = [];
  
  const currentHour = new Date().getHours();
  const chartData = Array.from({ length: 24 }).map((_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    actual: 0,
    expected: 0
  }));

  sites.forEach(site => {
    const data = siteDataMap[site.id];
    if (!data) return;
    
    const { dashboard: dash, alerts: siteAlerts } = data;
    
    if (dash) {
      totalPanels += (dash.total_panels || 0);
      currentOutput += (dash.current_power_w || 0);
      expectedOutput += (dash.expected_power_w || 0);
      
      const isNight = dash.expected_power_w === 0;
      if (isNight) {
        offlineSites++;
      } else if (dash.performance_percentage >= 60) {
        healthySites++;
      } else {
        attentionSites++;
      }

      if (dash.expected_power_w > 0) {
        chartData.forEach((point, i) => {
          if (i >= 6 && i <= 18) {
            const peak = 12;
            const factor = 1 - Math.pow((i - peak) / 6, 2);
            point.expected += dash.expected_power_w * factor;
            if (i <= currentHour) {
              point.actual += dash.current_power_w * factor * (dash.performance_percentage / 100);
            }
          }
        });
      }
    }

    if (siteAlerts) {
      totalAlerts += siteAlerts.length;
      siteAlerts.forEach(a => {
        alertsList.push({ siteName: site.name, siteId: site.id, ...a });
      });
    }

    const needsAttention = siteAlerts?.length > 0 || (dash && dash.expected_power_w > 0 && dash.performance_percentage < 60);
    if (needsAttention) {
      attentionList.push({
        ...site,
        dash,
        activeAlertCount: siteAlerts?.length || 0
      });
    }
  });

  alertsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const formatPower = (w) => {
    if (w >= 1000) return `${(w/1000).toFixed(1)} kW`;
    return `${w.toFixed(1)} W`;
  };

  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.name : 'Unknown Client';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-3">
        <AlertTriangle className="h-6 w-6 text-error" />
        <span className="text-small text-error font-medium">{error}</span>
        <Button variant="outline" size="small" onClick={fetchPlatformData}>Retry</Button>
      </div>
    );
  }

  const kpis = [
    { label: 'Clients', value: totalClients, icon: Users, iconColor: 'text-[#D59D80]', iconBg: 'bg-[rgba(213,157,128,0.10)]' },
    { label: 'Sites', value: totalSites, icon: Building, iconColor: 'text-[#6C8F8A]', iconBg: 'bg-[rgba(16,76,100,0.16)]' },
    { label: 'Panels', value: totalPanels, icon: Zap, iconColor: 'text-[#C6C0D0]', iconBg: 'bg-[rgba(198,192,208,0.10)]' },
    { label: 'Devices', value: totalDevices || '—', icon: Monitor, iconColor: 'text-txt-muted', iconBg: 'bg-surface-secondary' },
    { label: 'Alerts', value: totalAlerts, icon: AlertTriangle, iconColor: totalAlerts > 0 ? 'text-warning' : 'text-txt-muted', iconBg: totalAlerts > 0 ? 'bg-warning/10' : 'bg-surface-secondary' },
    { label: 'Output', value: formatPower(currentOutput), icon: Zap, iconColor: 'text-[#D59D80]', iconBg: 'bg-[rgba(213,157,128,0.10)]' },
  ];

  return (
    <div className="flex flex-col h-full bg-background gap-4">
      {/* 1. Header */}
      <div className="flex justify-between items-center mb-1 shrink-0">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-txt leading-tight tracking-tight">Platform Overview</h1>
          <p className="text-[13px] sm:text-[14px] text-txt-muted mt-0.5 font-normal">Real-time solar performance across all managed sites.</p>
        </div>
      </div>

      {/* 2. KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-surface border border-border rounded-lg p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-caption text-txt-muted font-medium uppercase tracking-wider">{kpi.label}</span>
                <div className={`h-7 w-7 rounded-md flex items-center justify-center ${kpi.iconBg}`}>
                  <Icon className={`h-3.5 w-3.5 ${kpi.iconColor}`} strokeWidth={1.8} />
                </div>
              </div>
              <span className="text-[20px] sm:text-[22px] font-bold text-txt tracking-tight font-mono">{kpi.value}</span>
            </div>
          );
        })}
      </div>

      {/* 3. Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0 h-[240px]">
        {/* Power Graph */}
        <div className="bg-surface border border-border rounded-lg p-0 flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border flex justify-between items-center bg-surface shrink-0">
            <span className="text-caption font-semibold text-txt uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#D59D80]" /> Platform Power
            </span>
            <span className="text-caption text-txt-muted">Today</span>
          </div>
          <div className="flex-1 p-3 flex flex-col min-h-0">
            <div className="flex gap-5 mb-2 shrink-0">
              <div>
                <span className="text-caption text-txt-muted block">Actual</span>
                <span className="text-subsection font-semibold text-[#D59D80]">{formatPower(currentOutput)}</span>
              </div>
              <div>
                <span className="text-caption text-txt-muted block">Expected</span>
                <span className="text-subsection font-semibold text-txt-secondary">{formatPower(expectedOutput)}</span>
              </div>
            </div>
            {currentOutput > 0 || expectedOutput > 0 ? (
              <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--bd)" opacity={0.6} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--tx-m)' }} minTickGap={25} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--tx-m)' }} tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`} />
                    <Tooltip 
                      contentStyle={{ 
                        fontSize: '11px', 
                        borderRadius: '6px', 
                        backgroundColor: 'var(--sf-el)', 
                        borderColor: 'var(--bd)',
                        color: 'var(--tx)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                      }} 
                    />
                    <Line type="monotone" dataKey="expected" stroke="var(--bd-s)" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="actual" stroke="var(--pr)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-caption text-txt-muted border border-dashed border-border rounded">
                No active power curve
              </div>
            )}
          </div>
        </div>

        {/* Health */}
        <div className="bg-surface border border-border rounded-lg p-0 flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border bg-surface shrink-0 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-success" />
            <span className="text-caption font-semibold text-txt uppercase tracking-wide">Platform Health</span>
          </div>
          <div className="flex-1 p-4 flex flex-col justify-center min-h-0">
            {totalSites > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex h-2.5 rounded-full overflow-hidden w-full bg-surface-secondary border border-border/40">
                  <div style={{ width: `${(healthySites/totalSites)*100}%` }} className="bg-success"></div>
                  <div style={{ width: `${(attentionSites/totalSites)*100}%` }} className="bg-warning"></div>
                  <div style={{ width: `${(offlineSites/totalSites)*100}%` }} className="bg-txt-muted opacity-40"></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-2 bg-surface-secondary rounded-lg">
                    <span className="text-caption text-txt-muted block">Healthy</span>
                    <span className="text-subsection font-semibold text-success">{healthySites}</span>
                  </div>
                  <div className="p-2 bg-surface-secondary rounded-lg">
                    <span className="text-caption text-txt-muted block">Attention</span>
                    <span className="text-subsection font-semibold text-warning">{attentionSites}</span>
                  </div>
                  <div className="p-2 bg-surface-secondary rounded-lg">
                    <span className="text-caption text-txt-muted block">Offline</span>
                    <span className="text-subsection font-semibold text-txt-muted">{offlineSites}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-caption text-txt-muted">
                No health telemetry
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-surface border border-border rounded-lg p-0 flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border flex justify-between items-center bg-surface shrink-0">
            <span className="text-caption font-semibold text-txt uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Active Alerts
            </span>
            {alertsList.length > 0 && (
              <button onClick={() => navigate('/alerts')} className="text-caption text-primary hover:underline font-medium cursor-pointer">
                View all
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {alertsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Check className="h-5 w-5 text-success mb-1 opacity-70" />
                <span className="text-caption text-txt font-medium">No active alerts</span>
                <span className="text-caption text-txt-muted">All systems operating nominal</span>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {alertsList.slice(0, 5).map((alert, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between px-3.5 py-2 hover:bg-surface-hover cursor-pointer transition-colors"
                    onClick={() => navigate(`/sites/${alert.siteId}`)}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-caption font-medium text-txt truncate">{alert.description}</span>
                      <span className="text-caption text-txt-muted truncate">
                        {alert.siteName} • {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                      alert.severity === 'CRITICAL' ? 'bg-error/15 text-error border border-error/20' :
                      alert.severity === 'WARNING' ? 'bg-warning/15 text-warning border border-warning/20' :
                      'bg-info/15 text-info border border-info/20'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Section Tables */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0 pb-1">
        {/* Attention Sites */}
        <div className="bg-surface border border-border rounded-lg p-0 flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border bg-surface shrink-0">
            <span className="text-caption font-semibold text-txt uppercase tracking-wide">Sites Requiring Attention</span>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {attentionList.length === 0 ? (
              <div className="flex items-center justify-center h-full text-caption text-txt-muted gap-1.5 p-4">
                <CheckCircle2 className="h-4 w-4 text-success" />
                All sites are operating normally.
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="table-header sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3">Site</th>
                    <th className="py-2 px-3">Client</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Performance</th>
                    <th className="py-2 px-3 text-right">Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attentionList.map(s => {
                    const perfRaw = s.dash?.performance_percentage || 0;
                    const perfStr = s.dash && s.dash.expected_power_w > 0 ? `${perfRaw.toFixed(1)}%` : '—';
                    return (
                      <tr 
                        key={s.id} 
                        onClick={() => navigate(`/sites/${s.id}`)} 
                        className="table-row cursor-pointer text-caption h-[50px]"
                      >
                        <td className="table-cell font-semibold text-txt">{s.name}</td>
                        <td className="table-cell-muted truncate max-w-[120px]">{getOrgName(s.organization_id)}</td>
                        <td className="table-cell">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className={`table-cell text-right font-medium font-mono ${perfRaw < 60 ? 'text-error' : 'text-txt'}`}>
                          {perfStr}
                        </td>
                        <td className="table-cell text-right">
                          {s.activeAlertCount > 0 ? (
                            <span className="inline-flex items-center justify-center bg-error/15 text-error border border-error/20 text-[10px] font-bold h-4 px-1.5 rounded">
                              {s.activeAlertCount}
                            </span>
                          ) : (
                            <span className="text-txt-muted opacity-40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Clients */}
        <div className="bg-surface border border-border rounded-lg p-0 flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border bg-surface shrink-0">
            <span className="text-caption font-semibold text-txt uppercase tracking-wide">Recent Clients</span>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {organizations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-caption text-txt-muted p-4 text-center">
                <span>No clients registered</span>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="table-header sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3 w-[40%]">Client</th>
                    <th className="py-2 px-3 text-right">Sites</th>
                    <th className="py-2 px-3 text-right">Panels</th>
                    <th className="py-2 px-3 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {organizations.slice(-6).reverse().map(org => {
                    const orgSites = sites.filter(s => s.organization_id === org.id);
                    let orgPanels = 0;
                    orgSites.forEach(s => {
                      if (siteDataMap[s.id]?.dashboard) {
                        orgPanels += siteDataMap[s.id].dashboard.total_panels;
                      }
                    });
                    return (
                      <tr key={org.id} className="table-row text-caption h-[50px]">
                        <td className="table-cell font-semibold text-txt truncate max-w-[140px]">{org.name}</td>
                        <td className="table-cell-muted text-right font-mono">{orgSites.length}</td>
                        <td className="table-cell-muted text-right font-mono">{orgPanels}</td>
                        <td className="table-cell pl-4 font-medium text-success">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-success"></span> Active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
