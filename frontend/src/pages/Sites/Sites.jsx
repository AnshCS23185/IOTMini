import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { getDashboard, getAlerts } from '../../api/dashboard';
import { Loader2, Search } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';

const Sites = () => {
  const [sitesData, setSitesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const fetchSites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sitesList = await getSites();
      
      // Fetch dashboard + alerts data for each site to populate the list
      const richSites = await Promise.all(sitesList.map(async (site) => {
        try {
          const dash = await getDashboard(site.id);
          const alerts = await getAlerts(site.id);
          return {
            ...site,
            dash,
            activeAlerts: alerts?.length || 0
          };
        } catch (e) {
          return { ...site, dash: null, activeAlerts: 0 };
        }
      }));
      
      setSitesData(richSites);
    } catch (err) {
      console.error(err);
      setError('Unable to load sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const filteredSites = sitesData.filter(site => {
    const q = searchQuery.toLowerCase();
    return site.name.toLowerCase().includes(q) || (site.location && site.location.toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-text-muted text-medium">Loading sites...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-status-error text-medium font-semibold">{error}</span>
        <button onClick={fetchSites} className="border border-border px-4 py-2 rounded text-text hover:bg-border/20 transition-colors">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-large font-display font-semibold text-text leading-tight">Solar Sites</h2>
          <span className="text-small text-text-muted">Manage and monitor all authorized installations</span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search sites..." 
            className="pl-9 pr-4 py-2 bg-surface border border-border rounded text-small text-text focus:outline-none focus:ring-1 focus:ring-primary w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-surface border border-border rounded shadow-sm">
        {filteredSites.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {searchQuery ? 'No sites match your search.' : 'No sites available.'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-border/30 text-text-muted text-small uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <th className="py-3 px-4 font-medium border-b border-border">Site Name</th>
                <th className="py-3 px-4 font-medium border-b border-border">Location</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Panels</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Current Power</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Performance</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Alerts</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.map((site, i) => {
                const dash = site.dash;
                const isNighttime = dash?.expected_power_w === 0;
                
                // Formats
                const power = dash ? (isNighttime ? '0 W' : (dash.current_power_w >= 1000 ? `${(dash.current_power_w/1000).toFixed(2)} kW` : `${dash.current_power_w.toFixed(1)} W`)) : 'N/A';
                const perf = dash ? (isNighttime ? 'N/A' : `${dash.performance_percentage?.toFixed(1)}%`) : 'N/A';
                const panels = dash?.total_panels ?? '-';
                const alerts = site.activeAlerts;
                
                return (
                  <tr 
                    key={site.id} 
                    onClick={() => navigate(`/sites/${site.id}`)}
                    className={`border-b border-border/50 hover:bg-border/20 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-border/5'}`}
                  >
                    <td className="py-3 px-4 text-text font-medium text-small">{site.name}</td>
                    <td className="py-3 px-4 text-text-muted text-small">{site.location || 'N/A'}</td>
                    <td className="py-3 px-4 text-text text-small text-right font-mono">{panels}</td>
                    <td className="py-3 px-4 text-text text-small text-right font-mono">{power}</td>
                    <td className="py-3 px-4 text-text text-small text-right font-mono">{perf}</td>
                    <td className="py-3 px-4 text-center">
                      {alerts > 0 ? (
                        <span className="inline-flex items-center justify-center bg-status-error text-[#ffffff] text-[11px] font-bold h-5 w-5 rounded-full">
                          {alerts}
                        </span>
                      ) : (
                        <span className="text-text-muted text-small">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end">
                        <StatusBadge status={site.status || 'UNKNOWN'} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Sites;
