import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { getDashboard } from '../../api/dashboard';
import { getPanelPerformanceHistory } from '../../api/performance';
import { getPanel, getPanelDiagnostics } from '../../api/panels';
import PerformanceChart from './PerformanceChart';
import { Loader2, Calendar, MapPin, Zap, Thermometer, Droplets, Cloud, CloudRain, ArrowLeft, Info, History, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

const Performance = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const location = useLocation();
  const navigate = useNavigate();
  const fromDiagnostics = location.state?.fromDiagnostics;

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSiteId = searchParams.get('siteId') || '';
  const panelIdParam = searchParams.get('panelId');

  const setSelectedSiteId = (id) => {
    setSelectedPanelIdState('ALL');
    setSearchParams(prev => {
      if (id) prev.set('siteId', id);
      else prev.delete('siteId');
      prev.delete('panelId');
      return prev;
    }, { replace: true });
  };
  
  const [sites, setSites] = useState([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedPanelIdState, setSelectedPanelIdState] = useState(panelIdParam || 'ALL');

  const selectedPanelId = panelIdParam || selectedPanelIdState;

  const setSelectedPanelId = (id) => {
    setSelectedPanelIdState(id);
    setSearchParams(prev => {
      if (id !== 'ALL') prev.set('panelId', id);
      else prev.delete('panelId');
      return prev;
    }, { replace: true });
  };
  
  const [dashboardData, setDashboardData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  
  const [panelDetails, setPanelDetails] = useState(null);
  const [panelDiagnostics, setPanelDiagnostics] = useState(null);

  useEffect(() => {
    if (selectedPanelId === 'ALL') {
      setPanelDetails(null);
      setPanelDiagnostics(null);
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const pId = Number(selectedPanelId);
        const [pData, dData] = await Promise.allSettled([
          getPanel(pId),
          getPanelDiagnostics(pId)
        ]);
        if (isMounted) {
          if (pData.status === 'fulfilled') setPanelDetails(pData.value);
          if (dData.status === 'fulfilled') setPanelDiagnostics(dData.value);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [selectedPanelId]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const sitesList = await getSites();
        setSites(sitesList);
        
        if (!isAdmin && sitesList.length > 0 && !searchParams.get('siteId')) {
          setSelectedSiteId(sitesList[0].id);
        }
      } catch (err) {
        setError('Failed to load authorized sites.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedSiteId) return;
    
    let isMounted = true;
    const fetchSiteContext = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const dash = await getDashboard(selectedSiteId);
        if (isMounted) setDashboardData(dash);
      } catch (err) {
        if (isMounted && !silent) setError('Failed to load site data.');
      } finally {
        if (isMounted && !silent) setLoading(false);
      }
    };
    fetchSiteContext(false);

    const interval = setInterval(() => {
      fetchSiteContext(true);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedSiteId]);

  useEffect(() => {
    if (!selectedSiteId || !dashboardData?.panels) return;
    
    let isMounted = true;
    const fetchHistory = async (isInitial = false) => {
      if (isInitial) setHistoryLoading(true);
      try {
        const to = new Date();
        const from = new Date();
        if (timeRange === 'today') {
          from.setHours(0,0,0,0);
        } else if (timeRange === 'yesterday') {
          from.setDate(from.getDate() - 1);
          from.setHours(0,0,0,0);
          to.setDate(to.getDate() - 1);
          to.setHours(23,59,59,999);
        } else if (timeRange === '7d') {
          from.setDate(to.getDate() - 7);
        } else if (timeRange === '30d') {
          from.setDate(to.getDate() - 30);
        }
        
        const fromIso = from.toISOString();
        const toIso = to.toISOString();
        
        if (selectedPanelId === 'ALL') {
          const promises = dashboardData.panels.map(p => getPanelPerformanceHistory(p.id, fromIso, toIso));
          const results = await Promise.allSettled(promises);
          
          // Aggregate by minute across panels: sum each panel's instantaneous power once per minute
          const timeMap = {};
          results.forEach((res, idx) => {
            if (res.status === 'fulfilled' && res.value) {
              const panelId = dashboardData.panels[idx]?.id || idx;
              res.value.forEach(record => {
                const dt = new Date(record.timestamp);
                dt.setSeconds(0, 0);
                const k = dt.toISOString();
                if (!timeMap[k]) {
                  timeMap[k] = {};
                }
                // Store the reading for this panel in this minute
                timeMap[k][panelId] = {
                  actual_power_w: record.actual_power_w || 0,
                  expected_power_w: record.expected_power_w || 0
                };
              });
            }
          });
          
          const aggregated = Object.entries(timeMap).map(([k, panelMap]) => {
            let actualSum = 0;
            let expectedSum = 0;
            Object.values(panelMap).forEach(pData => {
              actualSum += pData.actual_power_w;
              expectedSum += pData.expected_power_w;
            });
            return {
              timestamp: k,
              actual_power_w: Number(actualSum.toFixed(2)),
              expected_power_w: Number(expectedSum.toFixed(2))
            };
          }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

          if (isMounted) setHistoryData(aggregated);
        } else {
          const hist = await getPanelPerformanceHistory(selectedPanelId, fromIso, toIso);
          if (isMounted) setHistoryData(hist || []);
        }
      } catch (err) {
        console.error("Failed history fetch", err);
      } finally {
        if (isMounted && isInitial) setHistoryLoading(false);
      }
    };

    fetchHistory(true);

    const historyInterval = setInterval(() => {
      fetchHistory(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(historyInterval);
    };
  }, [selectedSiteId, selectedPanelId, timeRange, dashboardData?.panels?.map(p => p.id).join(',')]);

  let currentActual = 0;
  let currentExpected = 0;
  let currentPerf = 0;
  let activePanels = 0;
  let panelStatus = 'HEALTHY';

  // Energy & Summary Calculations
  let peakPower = 0;
  let averagePower = 0;
  let energyGeneratedWh = 0;
  let expectedEnergyWh = 0;
  
  if (historyData.length > 0) {
    let sumPower = 0;
    let validCount = 0;
    for (let i = 0; i < historyData.length; i++) {
      const pActRaw = historyData[i].actual_power_w;
      const pExpRaw = historyData[i].expected_power_w;
      
      const pAct = (pActRaw == null || pActRaw < 0) ? 0 : pActRaw;
      const pExp = (pExpRaw == null || pExpRaw < 0) ? 0 : pExpRaw;
      
      if (pAct > peakPower) peakPower = pAct;
      if (pActRaw != null) {
        sumPower += pAct;
        validCount++;
      }
      
      if (i > 0) {
        const dtCurrent = new Date(historyData[i].timestamp).getTime();
        const dtPrev = new Date(historyData[i-1].timestamp).getTime();
        
        if (!isNaN(dtCurrent) && !isNaN(dtPrev)) {
          const deltaHours = (dtCurrent - dtPrev) / (1000 * 3600);
          
          // Ignore negative intervals. Max allowable gap is 1.5 hours before we assume offline.
          if (deltaHours > 0 && deltaHours <= 1.5) {
            const prevActRaw = historyData[i-1].actual_power_w;
            const prevExpRaw = historyData[i-1].expected_power_w;
            
            const prevAct = (prevActRaw == null || prevActRaw < 0) ? 0 : prevActRaw;
            const prevExp = (prevExpRaw == null || prevExpRaw < 0) ? 0 : prevExpRaw;
            
            energyGeneratedWh += ((pAct + prevAct) / 2) * deltaHours;
            expectedEnergyWh += ((pExp + prevExp) / 2) * deltaHours;
          }
        }
      }
    }
    averagePower = validCount > 0 ? sumPower / validCount : 0;
  }
  const energyPerf = expectedEnergyWh > 0 ? (energyGeneratedWh / expectedEnergyWh) * 100 : 0;

  const formatPower = (val) => {
    if (val == null) return '—';
    if (Math.abs(val) >= 1000) return `${(val/1000).toFixed(2)} kW`;
    return `${val.toFixed(1)} W`;
  };

  const formatEnergy = (val) => {
    if (val == null || val === 0) return '0 Wh';
    if (val >= 1000) return `${(val/1000).toFixed(2)} kWh`;
    return `${val.toFixed(1)} Wh`;
  };

  if (dashboardData) {
    if (selectedPanelId === 'ALL') {
      currentActual = dashboardData.current_power_w;
      currentExpected = dashboardData.expected_power_w;
      currentPerf = dashboardData.performance_percentage;
      activePanels = dashboardData.total_panels;
      
      if (dashboardData.expected_power_w <= 0) {
        panelStatus = 'NO_SOLAR';
      } else if (dashboardData.current_power_w == null) {
        panelStatus = 'NO_DATA';
      } else if (currentPerf >= 85) {
        panelStatus = 'HEALTHY';
      } else if (currentPerf >= 60) {
        panelStatus = 'ATTENTION';
      } else {
        panelStatus = 'UNDERPERFORMING';
      }
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

  if (loading && !dashboardData && selectedSiteId) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Loading telemetry...</span>
      </div>
    );
  }

  return (
    <div className="page-container gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-1 gap-4">
        <div className="flex items-center gap-3">
          {fromDiagnostics && (
            <button 
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-txt-muted hover:text-txt cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5 text-txt" />
            </button>
          )}
          <div>
            <h1 className="text-[26px] sm:text-[28px] font-bold text-txt leading-tight tracking-tight">Performance Analytics</h1>
            <p className="text-[13px] sm:text-[14px] text-txt-muted mt-0.5 font-normal">Continuous yield curve modeling against predicted generation.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          {/* Site Selector */}
          {isAdmin ? (
            <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px]">
              <MapPin className="h-4 w-4 text-txt-muted mr-2" />
              <select 
                className={`bg-transparent text-small font-medium focus:outline-none cursor-pointer ${!selectedSiteId ? 'text-txt-muted' : 'text-txt'}`}
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
              >
                <option value="" disabled className="bg-surface text-txt-muted">Select Site ▾</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id} className="bg-surface text-txt">{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px]">
              <MapPin className="h-4 w-4 text-primary mr-2" />
              <span className="text-small font-medium text-txt">
                {sites.find(s => s.id == selectedSiteId)?.name || 'My Solar Installation'}
              </span>
            </div>
          )}

          {/* Time Range */}
          {selectedSiteId && (
            <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px]">
              <Calendar className="h-4 w-4 text-txt-muted mr-2" />
              <select 
                className="bg-transparent text-small text-txt font-medium focus:outline-none cursor-pointer"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="today" className="bg-surface text-txt">Today</option>
                <option value="yesterday" className="bg-surface text-txt">Yesterday</option>
                <option value="7d" className="bg-surface text-txt">Last 7 Days</option>
                <option value="30d" className="bg-surface text-txt">Last 30 Days</option>
              </select>
            </div>
          )}

          {/* Live Stream Indicator */}
          {selectedSiteId && (
            <div className="flex items-center gap-1.5 px-3 h-[38px] rounded-lg text-caption font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE
            </div>
          )}

          {/* Logs Toggle */}
          {selectedSiteId && (
            <Button variant="outline" size="sm" onClick={() => setShowLogs(true)} className="h-[38px]">
              <History className="h-4 w-4 mr-2" />
              Logs
            </Button>
          )}
        </div>
      </div>

      {!selectedSiteId ? (
        <div className="card flex-1 flex flex-col items-center justify-center text-center p-8">
          <MapPin className="h-8 w-8 text-txt-muted opacity-30 mb-2" />
          <h3 className="text-body font-semibold text-txt mb-1">Select a Site</h3>
          <p className="text-caption text-txt-muted max-w-sm">Choose a site from the dropdown to visualize performance analytics curves.</p>
        </div>
      ) : (
        <>
          {/* Enhanced KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 shrink-0">
            <div className="card p-3 flex flex-col justify-between">
              <span className="text-caption text-txt-muted uppercase tracking-wider font-medium">Actual Power</span>
              <span className="text-stat-sm font-mono font-semibold text-txt mt-1">
                {isNoData ? '—' : (isNighttime ? '0.0 W' : formatPower(currentActual))}
              </span>
            </div>
            <div className="card p-3 flex flex-col justify-between">
              <span className="text-caption text-txt-muted uppercase tracking-wider font-medium">Expected Power</span>
              <span className="text-stat-sm font-mono font-semibold text-txt-secondary mt-1">
                {formatPower(currentExpected)}
              </span>
            </div>
            <div className="card p-3 flex flex-col justify-between">
              <span className="text-caption text-txt-muted uppercase tracking-wider font-medium">Difference</span>
              <span className={`text-stat-sm font-mono font-semibold mt-1 ${(isNoData || isNighttime) ? 'text-txt-muted' : (currentActual - currentExpected >= 0 ? 'text-success' : 'text-error')}`}>
                {(isNoData || isNighttime) ? '—' : `${currentActual - currentExpected > 0 ? '+' : ''}${formatPower(currentActual - currentExpected)}`}
              </span>
            </div>
            <div className="card p-3 flex flex-col justify-between bg-surface-secondary border-primary/20">
              <span className="text-caption text-txt uppercase tracking-wider font-semibold">Performance</span>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[20px] font-mono font-bold ${isNighttime ? 'text-txt-muted' : (currentPerf < 60 ? 'text-error' : 'text-success')}`}>
                  {(isNighttime || isNoData || currentPerf == null) ? '—' : `${currentPerf.toFixed(1)}%`}
                </span>
                <StatusBadge status={isNighttime ? 'NO_SOLAR' : (isNoData ? 'NO_DATA' : panelStatus)} />
              </div>
            </div>
            <div className="card p-3 flex flex-col justify-between">
              <span className="text-caption text-txt-muted uppercase tracking-wider font-medium">Active Scope</span>
              <span className="text-stat-sm font-semibold text-txt mt-1">
                {selectedPanelId === 'ALL' ? `${activePanels} Panels` : '1 Panel'}
              </span>
            </div>
          </div>

          {/* Panel Context row */}
          {selectedPanelId !== 'ALL' && panelDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 shrink-0 mb-1">
              <div className="card p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4 text-primary" />
                  <h3 className="text-caption font-semibold text-txt uppercase tracking-wider">Panel Configuration</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-txt-muted uppercase">Technology</span>
                    <span className="text-small font-medium text-txt">{panelDetails.technology || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-txt-muted uppercase">Rated Power</span>
                    <span className="text-small font-medium text-txt">{panelDetails.rated_power_w} W</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-txt-muted uppercase">Tilt</span>
                    <span className="text-small font-medium text-txt">{panelDetails.tilt ? `${panelDetails.tilt}°` : 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-txt-muted uppercase">Azimuth</span>
                    <span className="text-small font-medium text-txt">{panelDetails.azimuth ? `${panelDetails.azimuth}°` : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="card p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <Cloud className="h-4 w-4 text-info" />
                  <h3 className="text-caption font-semibold text-txt uppercase tracking-wider">Environmental Context</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-txt-muted uppercase">Irradiance (LDR)</span>
                    <span className="text-small font-medium text-txt">{panelDiagnostics?.light_intensity != null ? panelDiagnostics.light_intensity.toFixed(0) : 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-txt-muted uppercase">Temperature</span>
                    <span className="text-small font-medium text-txt">{panelDiagnostics?.temperature != null ? `${panelDiagnostics.temperature}°C` : 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-txt-muted uppercase">Humidity</span>
                    <span className="text-small font-medium text-txt">{panelDiagnostics?.humidity != null ? `${panelDiagnostics.humidity}%` : 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-txt-muted uppercase">Cloud Cover</span>
                    <span className="text-small font-medium text-txt">{panelDiagnostics?.cloud_cover != null ? `${panelDiagnostics.cloud_cover}%` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Main Layout: Graph + Side Context */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
            {/* Left Col: Chart & KPIs */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-3">
              <div className="flex-1 shrink-0 relative min-h-[250px]">
                {historyLoading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
                    <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                )}
                <PerformanceChart data={historyData} />
              </div>

              {/* Performance Summary Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0 mt-1">
                <div className="card p-3 flex flex-col justify-between">
                  <span className="text-caption text-txt-muted uppercase tracking-wider font-medium">Peak Power</span>
                  <span className="text-stat-sm font-mono font-semibold text-txt mt-1">{formatPower(peakPower)}</span>
                </div>
                <div className="card p-3 flex flex-col justify-between">
                  <span className="text-caption text-txt-muted uppercase tracking-wider font-medium">Avg Power</span>
                  <span className="text-stat-sm font-mono font-semibold text-txt mt-1">{formatPower(averagePower)}</span>
                </div>
                <div className="card p-3 flex flex-col justify-between">
                  <span className="text-caption text-txt-muted uppercase tracking-wider font-medium">Energy Generated</span>
                  <span className="text-stat-sm font-mono font-semibold text-primary mt-1">{formatEnergy(energyGeneratedWh)}</span>
                </div>
                <div className="card p-3 flex flex-col justify-between">
                  <span className="text-caption text-txt-muted uppercase tracking-wider font-medium">Expected Energy</span>
                  <span className="text-stat-sm font-mono font-semibold text-txt-secondary mt-1">{formatEnergy(expectedEnergyWh)}</span>
                </div>
              </div>
            </div>

            {/* Right Col: Panel Selector */}
            <div className="w-full lg:w-96 flex flex-col gap-3 shrink-0">
              <div className="card p-0 flex flex-col flex-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-surface-secondary shrink-0 flex justify-between items-center">
                  <span className="text-caption font-semibold text-txt uppercase tracking-wider">Panel Comparison ({dashboardData?.panels?.length || 0})</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-border">
                  <div 
                    onClick={() => setSelectedPanelId('ALL')}
                    className={`px-3 py-2.5 mb-1 cursor-pointer flex justify-between items-center rounded transition-colors ${selectedPanelId === 'ALL' ? 'bg-primary/10 border border-primary/20 font-medium' : 'hover:bg-surface-hover'}`}
                  >
                    <span className="text-small text-txt">All Panels (Aggregate)</span>
                    <span className="text-caption text-txt-muted font-mono">{activePanels} Active</span>
                  </div>
                  
                  {dashboardData?.panels?.map(p => {
                    const isNight = p.expected_power_w === 0;
                    const noData = p.actual_power_w == null;
                    const isSelected = selectedPanelId === p.id.toString();
                    const isUnderperforming = p.status === 'UNDERPERFORMING';
                    
                    return (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedPanelId(p.id.toString())}
                        className={`px-3 py-2.5 cursor-pointer rounded transition-colors flex flex-col gap-1.5 ${isSelected ? 'bg-primary/10 border border-primary/20' : (isUnderperforming ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-surface-hover')}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-small font-semibold ${isSelected ? 'text-primary' : (isUnderperforming ? 'text-error' : 'text-txt')}`}>
                            {p.name}
                          </span>
                          <StatusBadge status={isNight ? 'NO_SOLAR' : (noData ? 'NO_DATA' : p.status)} />
                        </div>
                        <div className="flex justify-between items-end text-caption font-mono">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-txt-muted">A: {noData ? '—' : `${p.actual_power_w.toFixed(1)} W`}</span>
                            <span className="text-txt-muted">E: {`${p.expected_power_w.toFixed(1)} W`}</span>
                          </div>
                          <div className={`text-base font-bold ${isNight ? 'text-txt-muted' : (p.performance_percentage < 60 ? 'text-error' : 'text-success')}`}>
                            {(isNight || noData || p.performance_percentage == null) ? '—' : `${p.performance_percentage.toFixed(1)}%`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Slide-over for Historical Logs */}
      {showLogs && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowLogs(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-secondary">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-txt" />
                <h3 className="text-body font-semibold text-txt tracking-wider">Historical Logs</h3>
              </div>
              <button onClick={() => setShowLogs(false)} className="p-1 text-txt-muted hover:text-txt rounded-md hover:bg-surface-hover transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="table-header sticky top-0 z-10 bg-surface shadow-sm">
                  <tr>
                    <th className="py-3 px-5">Timestamp</th>
                    <th className="py-3 px-5 text-right">Actual</th>
                    <th className="py-3 px-5 text-right">Expected</th>
                    <th className="py-3 px-5 text-right">Perf %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyData.slice().reverse().map((row, i) => {
                    const dt = new Date(row.timestamp);
                    const isRowNight = row.expected_power_w === 0;
                    const isRowNoData = row.actual_power_w == null;
                    
                    const act = isRowNoData ? '—' : (isRowNight ? '0.0 W' : `${row.actual_power_w.toFixed(1)} W`);
                    const exp = `${row.expected_power_w.toFixed(1)} W`;
                    let perf = '—';
                    if (!isRowNight && !isRowNoData && row.actual_power_w != null && row.expected_power_w > 0) {
                      perf = `${((row.actual_power_w / row.expected_power_w) * 100).toFixed(1)}%`;
                    }

                    return (
                      <tr key={i} className="hover:bg-surface-hover transition-colors text-caption">
                        <td className="py-2.5 px-5 font-mono text-txt">
                          {dt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-5 font-mono text-right text-txt">{act}</td>
                        <td className="py-2.5 px-5 text-txt-muted font-mono text-right">{exp}</td>
                        <td className="py-2.5 px-5 font-mono text-right font-medium text-txt">{perf}</td>
                      </tr>
                    );
                  })}
                  {historyData.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-txt-muted text-caption">No historical telemetry points found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Performance;
