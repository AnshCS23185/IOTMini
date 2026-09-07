import React, { useState, useEffect } from 'react';
import { getDashboard, getAlerts } from '../../../api/dashboard';
import { Activity, ThermometerSun, Zap, AlertTriangle, CloudRain, Sun, Monitor, Server, Loader2 } from 'lucide-react';

export const OverviewTab = ({ site, org }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const [dash, activeAlerts] = await Promise.all([
          getDashboard(site.id),
          getAlerts(site.id)
        ]);
        if (isMounted) {
          setDashboardData(dash);
          setAlerts(activeAlerts);
        }
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        if (isMounted && !silent) setLoading(false);
      }
    };
    if (site?.id) {
      fetchData(false);
      const timer = setInterval(() => fetchData(true), 5000);
      return () => {
        isMounted = false;
        clearInterval(timer);
      };
    }
  }, [site?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-36 w-full gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Loading overview telemetry...</span>
      </div>
    );
  }

  if (!dashboardData) return <div className="text-caption text-txt-muted p-4">Unable to load overview data.</div>;

  const isNighttime = dashboardData.expected_power_w === 0;
  const currentOutput = isNighttime ? '0 W' : (dashboardData.current_power_w >= 1000 ? `${(dashboardData.current_power_w/1000).toFixed(2)} kW` : `${dashboardData.current_power_w.toFixed(1)} W`);
  const expectedOutput = dashboardData.expected_power_w >= 1000 ? `${(dashboardData.expected_power_w/1000).toFixed(2)} kW` : `${dashboardData.expected_power_w.toFixed(1)} W`;
  const perfRaw = dashboardData.performance_percentage || 0;
  const perf = isNighttime ? 'N/A' : `${perfRaw.toFixed(1)}%`;
  
  const siteStatus = isNighttime ? 'OFFLINE' : (perfRaw < 60 ? 'UNDERPERFORMING' : 'HEALTHY');
  const weather = dashboardData.weather || {};

  return (
    <div className="flex flex-col gap-3">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="card p-3 flex flex-col justify-between">
          <span className="text-caption text-txt-muted font-medium uppercase tracking-wider">Current Power</span>
          <span className="text-stat-sm font-mono font-semibold text-txt mt-1">{currentOutput}</span>
        </div>
        <div className="card p-3 flex flex-col justify-between">
          <span className="text-caption text-txt-muted font-medium uppercase tracking-wider">Expected Power</span>
          <span className="text-stat-sm font-mono font-semibold text-txt-secondary mt-1">{expectedOutput}</span>
        </div>
        <div className="card p-3 flex flex-col justify-between">
          <span className="text-caption text-txt-muted font-medium uppercase tracking-wider">Performance</span>
          <span className={`text-stat-sm font-mono font-semibold mt-1 ${isNighttime ? 'text-txt-muted' : (perfRaw < 60 ? 'text-error' : 'text-success')}`}>
            {perf}
          </span>
        </div>
        <div className="card p-3 flex flex-col justify-between">
          <span className="text-caption text-txt-muted font-medium uppercase tracking-wider">Site Status</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`h-2 w-2 rounded-full ${siteStatus === 'HEALTHY' ? 'bg-success' : (siteStatus === 'OFFLINE' ? 'bg-txt-muted' : 'bg-error')}`} />
            <span className={`text-subsection font-semibold ${siteStatus === 'HEALTHY' ? 'text-success' : (siteStatus === 'OFFLINE' ? 'text-txt-muted' : 'text-error')}`}>
              {siteStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Chart Column */}
        <div className="lg:col-span-2 card p-0 flex flex-col h-[240px] overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex justify-between items-center bg-surface-secondary shrink-0">
            <span className="text-caption font-semibold text-txt uppercase tracking-wide">Power Performance (Today)</span>
            <div className="flex gap-1">
              <span className="px-1.5 py-0.5 text-[10px] bg-primary text-primary-text rounded font-medium">1D</span>
              <span className="px-1.5 py-0.5 text-[10px] text-txt-muted border border-border rounded font-medium">7D</span>
              <span className="px-1.5 py-0.5 text-[10px] text-txt-muted border border-border rounded font-medium">30D</span>
            </div>
          </div>
          <div className="flex-1 p-4 relative flex items-center justify-center min-h-0">
            <div className="text-center z-10 p-3 rounded border border-border bg-surface-secondary/80">
              <p className="text-caption text-txt font-medium">Intraday telemetry curve</p>
              <p className="text-[11px] text-txt-muted mt-0.5">Continuous data logging active for this site.</p>
            </div>
          </div>
        </div>

        {/* Side Column */}
        <div className="flex flex-col gap-3">
          {/* Weather */}
          <div className="card p-0 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-surface-secondary shrink-0">
              <span className="text-caption font-semibold text-txt uppercase tracking-wide">Local Weather</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-border">
              <div className="p-2.5 flex flex-col">
                <div className="flex items-center gap-1 text-txt-muted mb-0.5">
                  <ThermometerSun className="h-3 w-3" />
                  <span className="text-[10px] uppercase font-medium">Temp</span>
                </div>
                <span className="text-small font-mono font-medium text-txt">{weather.temperature_c ?? '--'}°C</span>
              </div>
              <div className="p-2.5 flex flex-col">
                <div className="flex items-center gap-1 text-txt-muted mb-0.5">
                  <CloudRain className="h-3 w-3" />
                  <span className="text-[10px] uppercase font-medium">Rain</span>
                </div>
                <span className="text-small font-mono font-medium text-txt">{weather.precipitation_mm ?? '--'} mm</span>
              </div>
              <div className="p-2.5 flex flex-col">
                <div className="flex items-center gap-1 text-txt-muted mb-0.5">
                  <Sun className="h-3 w-3" />
                  <span className="text-[10px] uppercase font-medium">GHI</span>
                </div>
                <span className="text-small font-mono font-medium text-txt">{weather.ghi_wm2 ?? '--'} W/m²</span>
              </div>
              <div className="p-2.5 flex flex-col">
                <div className="flex items-center gap-1 text-txt-muted mb-0.5">
                  <Activity className="h-3 w-3" />
                  <span className="text-[10px] uppercase font-medium">Cloud</span>
                </div>
                <span className="text-small font-mono font-medium text-txt">{weather.cloud_cover_percent ?? '--'}%</span>
              </div>
            </div>
          </div>

          {/* Health Summary */}
          <div className="card p-0 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-surface-secondary shrink-0">
              <span className="text-caption font-semibold text-txt uppercase tracking-wide">Telemetry Summary</span>
            </div>
            <div className="p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-caption">
                <span className="text-txt-muted flex items-center gap-1.5"><Server className="h-3 w-3" /> Total Panels</span>
                <span className="font-mono font-medium text-txt">{dashboardData.total_panels || 0}</span>
              </div>
              <div className="flex items-center justify-between text-caption">
                <span className="text-txt-muted flex items-center gap-1.5"><Monitor className="h-3 w-3" /> Connected Devices</span>
                <span className="font-mono font-medium text-txt">{dashboardData.total_panels || 0}</span>
              </div>
              <div className="flex items-center justify-between text-caption">
                <span className="text-txt-muted flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Active Alerts</span>
                <span className={`font-mono font-medium ${alerts.length > 0 ? 'text-error font-semibold' : 'text-txt'}`}>{alerts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
