import React, { useState, useEffect } from 'react';
import { getSites, getDashboard, getAlerts } from '../../api/dashboard';
import OperationalSummary from './OperationalSummary';
import PanelHealthSummary from './PanelHealthSummary';
import PanelMonitoringTable from './PanelMonitoringTable';
import PerformanceVisualization from './PerformanceVisualization';
import WeatherAndAlerts from './WeatherAndAlerts';
import { Button } from '../../components/ui/Button';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  
  const [dashboardData, setDashboardData] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const sitesData = await getSites();
      setSites(sitesData);
      
      if (sitesData && sitesData.length > 0) {
        const defaultSiteId = sitesData[0].id;
        setSelectedSiteId(defaultSiteId);
        await fetchDashboardData(defaultSiteId);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load site data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (siteId) => {
    try {
      const [dash, alertsData] = await Promise.all([
        getDashboard(siteId),
        getAlerts(siteId)
      ]);
      setDashboardData(dash);
      setAlerts(alertsData);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleRetry = () => {
    fetchInitialData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-text-muted text-medium">Loading operational data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-status-error text-medium font-semibold">{error}</span>
        <Button variant="outline" onClick={handleRetry}>Retry Connection</Button>
      </div>
    );
  }

  if (!sites || sites.length === 0 || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <span className="text-text text-medium mb-2">No sites configured.</span>
        <span className="text-text-muted text-small">Please add a site and panels to begin monitoring.</span>
      </div>
    );
  }

  const activeSite = sites.find(s => s.id === selectedSiteId);

  return (
    <div className="flex flex-col h-full">
      {/* Context Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-large font-display font-semibold text-text leading-tight">
            {activeSite?.name || `Site ${selectedSiteId}`}
          </h2>
          {activeSite?.location && (
            <span className="text-small text-text-muted">{activeSite.location}</span>
          )}
        </div>
        
        {sites.length > 1 && (
          <select 
            className="bg-surface border border-border rounded px-3 py-1 text-small text-text focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedSiteId}
            onChange={async (e) => {
              const newId = Number(e.target.value);
              setSelectedSiteId(newId);
              setLoading(true);
              try {
                await fetchDashboardData(newId);
                setError(null);
              } catch (err) {
                setError('Unable to load site data');
              } finally {
                setLoading(false);
              }
            }}
          >
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main Dashboard Layout */}
      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
        
        {/* Top Strip: Operational Summary */}
        <div className="shrink-0">
          <OperationalSummary data={dashboardData} />
        </div>

        {/* Second Strip: Health & Split Viz */}
        <div className="flex flex-col lg:flex-row gap-4 shrink-0">
          <div className="flex-1 flex flex-col gap-4">
            <PanelHealthSummary data={dashboardData} />
            <div className="flex-1 min-h-[160px]">
              <WeatherAndAlerts weather={dashboardData.weather} alerts={alerts} />
            </div>
          </div>
          <div className="w-full lg:w-1/3 min-h-[160px]">
             <PerformanceVisualization 
                currentPower={dashboardData.current_power_w} 
                expectedPower={dashboardData.expected_power_w} 
             />
          </div>
        </div>

        {/* Bottom Section: Panel Table (Takes remaining height and scrolls internally if needed, but constrained) */}
        <div className="flex-1 flex flex-col min-h-0 mt-2">
          <h3 className="text-small font-semibold text-text uppercase tracking-wider mb-2 shrink-0">Panel Monitoring</h3>
          <div className="flex-1 overflow-auto rounded border border-border">
            <PanelMonitoringTable panels={dashboardData.panels} />
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;
