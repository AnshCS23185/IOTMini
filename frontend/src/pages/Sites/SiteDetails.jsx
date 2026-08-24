import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSite } from '../../api/sites';
import { getDashboard, getAlerts } from '../../api/dashboard';
import OperationalSummary from '../Dashboard/OperationalSummary';
import PanelHealthSummary from '../Dashboard/PanelHealthSummary';
import PanelMonitoringTable from '../Dashboard/PanelMonitoringTable';
import WeatherAndAlerts from '../Dashboard/WeatherAndAlerts';
import { Loader2, ArrowLeft } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

const SiteDetails = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();
  
  const [site, setSite] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sId = Number(siteId);
      const [siteData, dashData, alertsData] = await Promise.all([
        getSite(sId),
        getDashboard(sId),
        getAlerts(sId)
      ]);
      
      setSite(siteData);
      setDashboardData(dashData);
      setAlerts(alertsData);
    } catch (err) {
      console.error(err);
      setError('Unable to load site details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [siteId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-text-muted text-medium">Loading site details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-status-error text-medium font-semibold">{error}</span>
        <Button variant="outline" onClick={fetchData}>Retry Connection</Button>
      </div>
    );
  }

  if (!site || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <span className="text-text text-medium mb-2">Site not found.</span>
        <Button variant="ghost" onClick={() => navigate('/sites')}>Back to Sites</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button 
          onClick={() => navigate('/sites')}
          className="p-2 hover:bg-border/20 rounded transition-colors text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-large font-display font-semibold text-text leading-tight">{site.name}</h2>
            <StatusBadge status={site.status || 'UNKNOWN'} />
          </div>
          <span className="text-small text-text-muted">
            {site.location || 'Unknown Location'} • Timezone: {site.timezone || 'UTC'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Core Summaries */}
        <OperationalSummary data={dashboardData} />
        <PanelHealthSummary data={dashboardData} />

        {/* Middle Context */}
        <div className="h-[200px]">
          <WeatherAndAlerts weather={dashboardData.weather} alerts={alerts} />
        </div>

        {/* Panels Table */}
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="text-small font-semibold text-text uppercase tracking-wider">Site Panels</h3>
          <PanelMonitoringTable panels={dashboardData.panels} />
        </div>
      </div>
    </div>
  );
};

export default SiteDetails;
