import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { getDashboard } from '../../api/dashboard';
import { Loader2, Search } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';

const Panels = () => {
  const [panelsData, setPanelsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const fetchPanels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sitesList = await getSites();
      let allPanels = [];
      
      // Fetch dashboard data for each site to get populated panel metrics efficiently (avoids N+1)
      await Promise.all(sitesList.map(async (site) => {
        try {
          const dash = await getDashboard(site.id);
          if (dash && dash.panels) {
            const sitePanels = dash.panels.map(p => ({
              ...p,
              siteName: site.name,
              siteId: site.id
            }));
            allPanels = [...allPanels, ...sitePanels];
          }
        } catch (e) {
          console.error(`Failed to load panels for site ${site.id}`);
        }
      }));
      
      setPanelsData(allPanels);
    } catch (err) {
      console.error(err);
      setError('Unable to load panels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPanels();
  }, []);

  const filteredPanels = panelsData.filter(panel => {
    const q = searchQuery.toLowerCase();
    return panel.name.toLowerCase().includes(q) || panel.siteName.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-text-muted text-medium">Loading panel telemetry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-status-error text-medium font-semibold">{error}</span>
        <button onClick={fetchPanels} className="border border-border px-4 py-2 rounded text-text hover:bg-border/20 transition-colors">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-large font-display font-semibold text-text leading-tight">Solar Panels</h2>
          <span className="text-small text-text-muted">Global overview of all deployed panel assets</span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search panels or sites..." 
            className="pl-9 pr-4 py-2 bg-surface border border-border rounded text-small text-text focus:outline-none focus:ring-1 focus:ring-primary w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-surface border border-border rounded shadow-sm">
        {filteredPanels.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {searchQuery ? 'No panels match your search.' : 'No panels found in any authorized site.'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-border/30 text-text-muted text-small uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <th className="py-3 px-4 font-medium border-b border-border">Panel</th>
                <th className="py-3 px-4 font-medium border-b border-border">Site Context</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Rated (W)</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Actual (W)</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Expected (W)</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Perf %</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPanels.map((panel, i) => {
                const isNighttime = panel.expected_power_w === 0;
                const isNoData = panel.actual_power_w == null;
                
                // Formatting based on business rules
                const actual = isNoData ? 'N/A' : (isNighttime ? '0.0' : panel.actual_power_w.toFixed(1));
                const expected = panel.expected_power_w.toFixed(1);
                const perf = (isNighttime || isNoData || panel.performance_percentage == null) 
                  ? 'N/A' 
                  : `${panel.performance_percentage.toFixed(1)}%`;
                const status = isNighttime ? 'NO_SOLAR' : (isNoData ? 'NO_DATA' : panel.status);

                return (
                  <tr 
                    key={panel.id} 
                    onClick={() => navigate(`/panels/${panel.id}`)}
                    className={`border-b border-border/50 hover:bg-border/20 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-border/5'}`}
                  >
                    <td className="py-3 px-4 text-text font-semibold text-small">{panel.name}</td>
                    <td className="py-3 px-4 text-text-muted text-small">{panel.siteName}</td>
                    <td className="py-3 px-4 text-text text-small text-right font-mono">{panel.rated_power_w}</td>
                    <td className="py-3 px-4 text-text text-small text-right font-mono">{actual}</td>
                    <td className="py-3 px-4 text-text text-small text-right font-mono">{expected}</td>
                    <td className="py-3 px-4 text-text text-small text-right font-mono">{perf}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end">
                        <StatusBadge status={status} />
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

export default Panels;
