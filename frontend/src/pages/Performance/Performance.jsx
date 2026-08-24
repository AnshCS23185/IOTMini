import React, { useState, useEffect, useMemo } from 'react';
import { getSites } from '../../api/sites';
import { getDashboard } from '../../api/dashboard';
import { getPanelPerformanceHistory } from '../../api/performance';
import { getPanelDiagnostics } from '../../api/panels';
import PerformanceChart from './PerformanceChart';
import { Loader2, Calendar, MapPin, Zap, Thermometer, Droplets, Cloud, CloudRain } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';

const Performance = () => {
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  
  const [timeRange, setTimeRange] = useState('7d'); // 'today', '7d', '30d'
  
  const [selectedPanelId, setSelectedPanelId] = useState('ALL'); // 'ALL' or panel.id
  
  const [dashboardData, setDashboardData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [panelDiagnostic, setPanelDiagnostic] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Initial Load: Fetch Sites
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const sitesList = await getSites();
        setSites(sitesList);
        if (sitesList.length > 0) {
          setSelectedSiteId(sitesList[0].id.toString());
        }
      } catch (err) {
        setError('Failed to load authorized sites.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 2. Fetch Dashboard & Panels when Site changes
  useEffect(() => {
    if (!selectedSiteId) return;
    
    const fetchSiteContext = async () => {
      try {
        setLoading(true);
        setSelectedPanelId('ALL'); // reset
        const dash = await getDashboard(selectedSiteId);
        setDashboardData(dash);
      } catch (err) {
        setError('Failed to load site data.');
      } finally {
        setLoading(false);
      }
    };
    fetchSiteContext();
  }, [selectedSiteId]);

  // 3. Fetch History when Site, Panel, or Time Range changes
  useEffect(() => {
    if (!dashboardData || !dashboardData.panels) return;
    
    const fetchHistory = async () => {
      setHistoryLoading(true);
      setPanelDiagnostic(null);
      try {
        const to = new Date();
        const from = new Date();
        if (timeRange === 'today') from.setHours(0,0,0,0);
        else if (timeRange === '7d') from.setDate(to.getDate() - 7);
        else if (timeRange === '30d') from.setDate(to.getDate() - 30);
        
        const fromIso = from.toISOString();
        const toIso = to.toISOString();
        
        if (selectedPanelId === 'ALL') {
          // Aggregate all panels in the site
          const promises = dashboardData.panels.map(p => getPanelPerformanceHistory(p.id, fromIso, toIso));
          const results = await Promise.allSettled(promises);
          
          const timeMap = {};
          
          results.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
              res.value.forEach(record => {
                // Group by minute
                const dt = new Date(record.timestamp);
                dt.setSeconds(0,0);
                const key = dt.getTime();
                
                if (!timeMap[key]) {
                  timeMap[key] = {
                    timestamp: record.timestamp, // keep original string
                    actual: 0,
                    expected: 0,
                    validActual: false,
                    isNight: true
                  };
                }
                
                if (record.actual_power_w != null) {
                  timeMap[key].actual += record.actual_power_w;
                  timeMap[key].validActual = true;
                }
                if (record.expected_power_w != null) {
                  timeMap[key].expected += record.expected_power_w;
                  if (record.expected_power_w > 0) timeMap[key].isNight = false;
                }
              });
            }
          });
          
          const aggregated = Object.values(timeMap).map(bucket => ({
            timestamp: bucket.timestamp,
            actual_power_w: bucket.validActual ? bucket.actual : null,
            expected_power_w: bucket.expected,
            status: bucket.isNight ? 'NO_SOLAR' : (bucket.validActual ? 'HEALTHY' : 'NO_DATA')
          }));
          
          setHistoryData(aggregated);
          
        } else {
          // Fetch specific panel
          const pId = Number(selectedPanelId);
          const hist = await getPanelPerformanceHistory(pId, fromIso, toIso);
          setHistoryData(hist || []);
          
          // Also fetch diagnostic for this panel
          try {
            const diag = await getPanelDiagnostics(pId);
            setPanelDiagnostic(diag);
          } catch (e) {
            // ignore if no diagnostic available
          }
        }
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setHistoryLoading(false);
      }
    };
    
    fetchHistory();
  }, [dashboardData, selectedPanelId, timeRange]);

  if (loading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-text-muted text-medium">Loading performance analytics...</span>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-status-error text-medium font-semibold">{error}</span>
        <button onClick={() => window.location.reload()} className="border border-border px-4 py-2 rounded text-text hover:bg-border/20 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  // Determine current active metrics based on Selection
  let currentActual = 0;
  let currentExpected = 0;
  let currentPerf = null;
  let activePanels = 0;
  let panelStatus = 'HEALTHY';
  
  if (dashboardData) {
    if (selectedPanelId === 'ALL') {
      currentActual = dashboardData.current_power_w;
      currentExpected = dashboardData.expected_power_w;
      currentPerf = dashboardData.performance_percentage;
      activePanels = dashboardData.total_panels;
      panelStatus = dashboardData.expected_power_w === 0 ? 'NO_SOLAR' : 'HEALTHY'; // Macro status
    } else {
      const panel = dashboardData.panels.find(p => p.id === Number(selectedPanelId));
      if (panel) {
        currentActual = panel.actual_power_w;
        currentExpected = panel.expected_power_w;
        currentPerf = panel.performance_percentage;
        activePanels = 1;
        panelStatus = panel.status;
      }
    }
  }

  const isNighttime = currentExpected === 0;
  const isNoData = currentActual == null;

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4">
        <div>
          <h2 className="text-large font-display font-semibold text-text leading-tight">Performance Analytics</h2>
          <span className="text-small text-text-muted">Analyze power generation against expected yields</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Site Selector */}
          <div className="flex items-center border border-border bg-surface rounded px-3 py-1.5">
            <MapPin className="h-4 w-4 text-text-muted mr-2" />
            <select 
              className="bg-transparent text-small text-text font-medium focus:outline-none cursor-pointer"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              {sites.map(s => (
                <option key={s.id} value={s.id} className="bg-surface">{s.name}</option>
              ))}
            </select>
          </div>

          {/* Time Range */}
          <div className="flex items-center border border-border bg-surface rounded px-3 py-1.5">
            <Calendar className="h-4 w-4 text-text-muted mr-2" />
            <select 
              className="bg-transparent text-small text-text font-medium focus:outline-none cursor-pointer"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="today" className="bg-surface">Today</option>
              <option value="7d" className="bg-surface">Last 7 Days</option>
              <option value="30d" className="bg-surface">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
          <span className="text-small text-text-muted uppercase tracking-wider font-semibold">Current Power</span>
          <span className="text-large font-display text-text mt-1">
            {isNoData ? 'N/A' : (isNighttime ? '0 W' : (currentActual >= 1000 ? `${(currentActual/1000).toFixed(2)} kW` : `${currentActual.toFixed(1)} W`))}
          </span>
        </div>
        <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
          <span className="text-small text-text-muted uppercase tracking-wider font-semibold">Expected Power</span>
          <span className="text-large font-display text-text mt-1">
            {currentExpected >= 1000 ? `${(currentExpected/1000).toFixed(2)} kW` : `${currentExpected.toFixed(1)} W`}
          </span>
        </div>
        <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
          <span className="text-small text-text-muted uppercase tracking-wider font-semibold">Performance</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-large font-display text-text">
              {(isNighttime || isNoData || currentPerf == null) ? 'N/A' : `${currentPerf.toFixed(1)}%`}
            </span>
            {selectedPanelId !== 'ALL' && <StatusBadge status={isNighttime ? 'NO_SOLAR' : (isNoData ? 'NO_DATA' : panelStatus)} />}
          </div>
        </div>
        <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
          <span className="text-small text-text-muted uppercase tracking-wider font-semibold">Active Scope</span>
          <span className="text-large font-display text-text mt-1">
            {selectedPanelId === 'ALL' ? `${activePanels} Panels` : '1 Panel'}
          </span>
        </div>
      </div>

      {/* Main Layout: Graph + Side Context */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
        
        {/* Left Col: Chart & History */}
        <div className="flex-1 flex flex-col min-w-0 gap-4">
          
          {/* Chart */}
          <div className="h-64 shrink-0 relative">
            {historyLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 backdrop-blur-[1px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <PerformanceChart data={historyData} />
          </div>

          {/* History List */}
          <div className="flex-1 min-h-0 border border-border bg-surface rounded flex flex-col">
             <div className="px-4 py-2 border-b border-border bg-border/20 shrink-0">
               <span className="text-small font-semibold text-text uppercase tracking-wider">Historical Log</span>
             </div>
             <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-surface shadow-sm z-10">
                    <tr className="text-text-muted text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-4 font-medium border-b border-border">Timestamp</th>
                      <th className="py-2 px-4 font-medium border-b border-border text-right">Actual</th>
                      <th className="py-2 px-4 font-medium border-b border-border text-right">Expected</th>
                      <th className="py-2 px-4 font-medium border-b border-border text-right">Perf %</th>
                      <th className="py-2 px-4 font-medium border-b border-border text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.slice().reverse().map((row, i) => {
                      const dt = new Date(row.timestamp);
                      const isRowNight = row.expected_power_w === 0;
                      const isRowNoData = row.actual_power_w == null;
                      
                      const act = isRowNoData ? 'N/A' : (isRowNight ? '0.0' : row.actual_power_w.toFixed(1));
                      const exp = row.expected_power_w.toFixed(1);
                      let perf = 'N/A';
                      if (!isRowNight && !isRowNoData && row.actual_power_w != null && row.expected_power_w > 0) {
                        perf = ((row.actual_power_w / row.expected_power_w) * 100).toFixed(1) + '%';
                      }

                      return (
                        <tr key={i} className="border-b border-border/30 hover:bg-border/10 text-[13px]">
                          <td className="py-2 px-4 text-text font-mono">{dt.toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                          <td className="py-2 px-4 text-text text-right font-mono">{act}</td>
                          <td className="py-2 px-4 text-text text-right font-mono">{exp}</td>
                          <td className="py-2 px-4 text-text text-right font-mono">{perf}</td>
                          <td className="py-2 px-4 text-right">
                            <span className="text-[10px] font-bold text-text-muted">{row.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {historyData.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-text-muted text-small">No historical data found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* Right Col: Context & Selection */}
        <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto">
          
          {/* Panel Selector & Comparison Table */}
          <div className="border border-border bg-surface rounded flex flex-col max-h-96">
             <div className="px-4 py-3 border-b border-border bg-border/20 shrink-0 flex justify-between items-center">
               <span className="text-small font-semibold text-text uppercase tracking-wider">Panel Comparison</span>
             </div>
             
             <div className="flex flex-col flex-1 overflow-y-auto p-1">
               <div 
                 onClick={() => setSelectedPanelId('ALL')}
                 className={`px-3 py-2 cursor-pointer flex justify-between items-center rounded mb-1 transition-colors ${selectedPanelId === 'ALL' ? 'bg-primary/20 border border-primary/30' : 'hover:bg-border/20 border border-transparent'}`}
               >
                 <span className={`text-small font-semibold ${selectedPanelId === 'ALL' ? 'text-primary' : 'text-text'}`}>All Panels (Site Avg)</span>
                 <span className="text-[11px] text-text-muted font-mono">{activePanels} Active</span>
               </div>
               
               <div className="h-px bg-border my-1 mx-2"></div>
               
               {dashboardData?.panels.map(p => {
                 const isNight = p.expected_power_w === 0;
                 const noData = p.actual_power_w == null;
                 const status = isNight ? 'NO_SOLAR' : (noData ? 'NO_DATA' : p.status);
                 
                 return (
                   <div 
                    key={p.id}
                    onClick={() => setSelectedPanelId(p.id.toString())}
                    className={`px-3 py-2 cursor-pointer rounded mb-1 flex flex-col gap-1 transition-colors ${selectedPanelId === p.id.toString() ? 'bg-primary/10 border border-primary/20' : 'hover:bg-border/10 border border-transparent border-b-border/30'}`}
                   >
                     <div className="flex justify-between items-center">
                       <span className={`text-small font-semibold ${selectedPanelId === p.id.toString() ? 'text-primary' : 'text-text'}`}>{p.name}</span>
                       <StatusBadge status={status} />
                     </div>
                     <div className="flex justify-between items-center text-[11px] font-mono text-text-muted">
                       <span>A: {noData ? 'N/A' : p.actual_power_w.toFixed(1)}</span>
                       <span>E: {p.expected_power_w.toFixed(1)}</span>
                       <span>{(isNight || noData || p.performance_percentage == null) ? 'N/A' : p.performance_percentage.toFixed(0)+'%'}</span>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>

          {/* Context Blocks */}
          <div className="flex flex-col gap-4 shrink-0 pb-2">
            {/* Weather Context (from Dashboard) */}
            {dashboardData?.weather && (
              <div className="border border-border bg-surface p-4 rounded flex flex-col gap-3">
                 <span className="text-small font-semibold text-text uppercase tracking-wider">Site Weather Context</span>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="flex items-center gap-2">
                     <Thermometer className="h-4 w-4 text-status-warning" />
                     <span className="text-small text-text">{dashboardData.weather.temperature}°C</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <Droplets className="h-4 w-4 text-status-info" />
                     <span className="text-small text-text">{dashboardData.weather.humidity}%</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <Cloud className="h-4 w-4 text-text-muted" />
                     <span className="text-small text-text">{dashboardData.weather.cloud_cover}%</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <CloudRain className="h-4 w-4 text-primary" />
                     <span className="text-small text-text">{dashboardData.weather.precipitation}mm</span>
                   </div>
                 </div>
              </div>
            )}

            {/* Diagnostic Context (If specific panel selected and diag available) */}
            {selectedPanelId !== 'ALL' && panelDiagnostic && (
              <div className="border border-status-warning/40 bg-status-warning/10 p-4 rounded flex flex-col gap-2">
                 <div className="flex items-center gap-2 mb-1">
                   <Zap className="h-4 w-4 text-status-warning" />
                   <span className="text-small font-semibold text-text uppercase tracking-wider">Diagnostic State</span>
                 </div>
                 <div className="flex justify-between text-small border-b border-border/50 pb-1">
                   <span className="text-text-muted">LDR Sensor</span>
                   <span className="font-mono text-text">{panelDiagnostic.light_intensity?.toFixed(0) || 'N/A'}</span>
                 </div>
                 <div className="flex justify-between text-small border-b border-border/50 pb-1">
                   <span className="text-text-muted">LDR Baseline</span>
                   <span className="font-mono text-text">{panelDiagnostic.light_baseline?.toFixed(0) || 'N/A'}</span>
                 </div>
                 {panelDiagnostic.reason && (
                   <div className="mt-1">
                     <span className="text-[11px] text-status-warning font-semibold leading-tight block">{panelDiagnostic.reason}</span>
                   </div>
                 )}
              </div>
            )}
          </div>
          
        </div>
      </div>
      
    </div>
  );
};

export default Performance;
