import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { getSitePanels } from '../../api/panels';
import { getPanelDiagnostic } from '../../api/diagnostics';
import { Loader2, Search, Filter } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';

const Diagnostics = () => {
  const [diagnosticsData, setDiagnosticsData] = useState([]);
  const [sitesList, setSitesList] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch authorized sites
      const sites = await getSites();
      setSitesList(sites);
      
      let allPanels = [];
      
      // 2. Fetch panels for each site
      for (const site of sites) {
        if (selectedSiteId !== 'ALL' && selectedSiteId !== site.id.toString()) continue;
        
        try {
          const panels = await getSitePanels(site.id);
          panels.forEach(p => allPanels.push({ ...p, siteName: site.name }));
        } catch (e) {
          console.error(`Failed to load panels for site ${site.id}`);
        }
      }

      // 3. Fetch diagnostics for all panels (Promise.all)
      const diagPromises = allPanels.map(p => getPanelDiagnostic(p.id).catch(() => null));
      const diagResults = await Promise.all(diagPromises);

      const combined = allPanels.map((panel, idx) => ({
        ...panel,
        diagnostic: diagResults[idx]
      }));

      setDiagnosticsData(combined);
    } catch (err) {
      console.error(err);
      setError('Unable to load diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, [selectedSiteId]);

  const filteredData = diagnosticsData.filter(item => {
    if (statusFilter === 'ALL') return true;
    const currentStatus = item.diagnostic ? item.diagnostic.status : 'NO_DATA';
    return currentStatus === statusFilter;
  });

  if (loading && diagnosticsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-text-muted text-medium">Evaluating diagnostic states...</span>
      </div>
    );
  }

  if (error && diagnosticsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-status-error text-medium font-semibold">{error}</span>
        <button onClick={fetchDiagnostics} className="border border-border px-4 py-2 rounded text-text hover:bg-border/20 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-4 gap-4">
        <div>
          <h2 className="text-large font-display font-semibold text-text leading-tight">Diagnostics</h2>
          <span className="text-small text-text-muted">Global overview of diagnostic conditions across all panels</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Site Filter */}
          <div className="flex items-center border border-border bg-surface rounded px-3 py-1.5">
            <Filter className="h-4 w-4 text-text-muted mr-2" />
            <select 
              className="bg-transparent text-small text-text font-medium focus:outline-none cursor-pointer"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="ALL" className="bg-surface">All Sites</option>
              {sitesList.map(s => (
                <option key={s.id} value={s.id} className="bg-surface">{s.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center border border-border bg-surface rounded px-3 py-1.5">
            <Filter className="h-4 w-4 text-text-muted mr-2" />
            <select 
              className="bg-transparent text-small text-text font-medium focus:outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL" className="bg-surface">All Statuses</option>
              <option value="HEALTHY" className="bg-surface">Healthy</option>
              <option value="ATTENTION" className="bg-surface">Attention</option>
              <option value="WEATHER_RELATED" className="bg-surface">Weather Related</option>
              <option value="LOCAL_SHADING" className="bg-surface">Local Shading</option>
              <option value="THERMAL_PERFORMANCE_LOSS" className="bg-surface">Thermal Loss</option>
              <option value="PANEL_UNDERPERFORMANCE" className="bg-surface">Underperformance</option>
              <option value="DEVICE_OFFLINE" className="bg-surface">Device Offline</option>
              <option value="NO_SOLAR" className="bg-surface">No Solar</option>
              <option value="NO_DATA" className="bg-surface">No Data</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 min-h-0 overflow-auto bg-surface border border-border rounded shadow-sm">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {loading ? 'Refreshing...' : 'All monitored panels are operating normally based on filters.'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-border/30 text-text-muted text-[11px] uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <th className="py-3 px-4 font-medium border-b border-border">Panel</th>
                <th className="py-3 px-4 font-medium border-b border-border">Site</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Status</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Perf %</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Confidence</th>
                <th className="py-3 px-4 font-medium border-b border-border">Reason</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Last Evaluated</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, i) => {
                const diag = item.diagnostic;
                const status = diag ? diag.status : 'NO_DATA';
                
                // Nighttime check directly from expected power
                const isNighttime = diag ? (diag.expected_power_w === 0) : false;
                // Actually, backend diagnostic engine sets status = NO_SOLAR if expected is 0. 
                // We trust the backend diag completely.
                
                let perfDisplay = 'N/A';
                if (diag && diag.performance_percentage != null && !isNighttime) {
                  perfDisplay = diag.performance_percentage.toFixed(1) + '%';
                }

                let confDisplay = 'N/A';
                if (diag && diag.diagnostic_confidence != null) {
                  confDisplay = (diag.diagnostic_confidence * 100).toFixed(0) + '%';
                }

                const reason = diag?.reason || (status === 'NO_SOLAR' ? 'Normal nighttime condition' : 'No diagnostic reason available');
                const lastEval = diag ? new Date(diag.timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'N/A';

                return (
                  <tr 
                    key={item.id} 
                    onClick={() => navigate(`/panels/${item.id}/diagnostics`)}
                    className={`border-b border-border/50 hover:bg-border/20 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-border/5'}`}
                  >
                    <td className="py-3 px-4 text-text font-semibold text-small">{item.name}</td>
                    <td className="py-3 px-4 text-text-muted text-small">{item.siteName}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                        <StatusBadge status={status} />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text text-small text-right font-mono">{perfDisplay}</td>
                    <td className="py-3 px-4 text-text text-small text-right font-mono">{confDisplay}</td>
                    <td className="py-3 px-4 text-text-muted text-small truncate max-w-xs" title={reason}>{reason}</td>
                    <td className="py-3 px-4 text-text-muted text-[11px] text-right font-mono">{lastEval}</td>
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

export default Diagnostics;
