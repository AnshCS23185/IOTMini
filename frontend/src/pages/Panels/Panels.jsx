import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { getDashboard } from '../../api/dashboard';
import { Search } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

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
      <div className="flex flex-col items-center justify-center h-full w-full gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Loading panel assets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-3">
        <span className="text-small text-error font-medium">{error}</span>
        <Button variant="outline" size="small" onClick={fetchPanels}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="page-container gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-1 gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-txt leading-tight tracking-tight">Solar Panels</h1>
          <p className="text-[13px] sm:text-[14px] text-txt-muted mt-0.5 font-normal">Asset inventory, instantaneous output, and string telemetry.</p>
        </div>
        
        <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px] w-64">
          <Search className="h-4 w-4 text-txt-muted mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Search panels or sites..." 
            className="bg-transparent text-small text-txt focus:outline-none w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card p-0 flex-1 overflow-auto">
        {filteredPanels.length === 0 ? (
          <div className="p-8 text-center text-txt-muted text-caption">
            {searchQuery ? 'No panels match your search.' : 'No panel assets registered across managed sites.'}
          </div>
        ) : (
          <table className="w-full text-left whitespace-nowrap">
            <thead className="table-header sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3">Panel</th>
                <th className="py-2 px-3">Site Context</th>
                <th className="py-2 px-3 text-right">Rated</th>
                <th className="py-2 px-3 text-right">Actual</th>
                <th className="py-2 px-3 text-right">Expected</th>
                <th className="py-2 px-3 text-right">Perf %</th>
                <th className="py-2 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPanels.map((panel) => {
                const isNighttime = panel.expected_power_w === 0;
                const isNoData = panel.actual_power_w == null;
                
                const actual = isNoData ? '—' : (isNighttime ? '0.0 W' : `${panel.actual_power_w.toFixed(1)} W`);
                const expected = `${panel.expected_power_w.toFixed(1)} W`;
                const perf = (isNighttime || isNoData || panel.performance_percentage == null) 
                  ? '—' 
                  : `${panel.performance_percentage.toFixed(1)}%`;
                const status = isNighttime ? 'NO_SOLAR' : (isNoData ? 'NO_DATA' : panel.status);

                return (
                  <tr 
                    key={panel.id} 
                    onClick={() => navigate(`/panels/${panel.id}`)}
                    className="table-row cursor-pointer text-caption"
                  >
                    <td className="table-cell font-medium text-txt">{panel.name}</td>
                    <td className="table-cell-muted">{panel.siteName}</td>
                    <td className="table-cell-muted text-right font-mono">{panel.rated_power_w} W</td>
                    <td className="table-cell text-right font-mono text-txt">{actual}</td>
                    <td className="table-cell-muted text-right font-mono">{expected}</td>
                    <td className="table-cell text-right font-mono font-medium text-txt">{perf}</td>
                    <td className="table-cell text-right">
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
