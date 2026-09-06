import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { getSitePanels } from '../../api/panels';
import { getPanelDiagnostic } from '../../api/diagnostics';
import { Filter } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const Diagnostics = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSiteId = searchParams.get('siteId') || '';
  const setSelectedSiteId = (id) => {
    setSearchParams(prev => {
      if (id) prev.set('siteId', id);
      else prev.delete('siteId');
      return prev;
    }, { replace: true });
  };

  const [diagnosticsData, setDiagnosticsData] = useState([]);
  const [sitesList, setSitesList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);

      const sites = await getSites();
      setSitesList(sites);
      
      let allPanels = [];
      let currentSiteId = selectedSiteId;
      
      if (!currentSiteId && !isAdmin && sites.length > 0) {
        currentSiteId = sites[0].id.toString();
        setSelectedSiteId(currentSiteId);
      }
      
      if (currentSiteId) {
        const site = sites.find(s => s.id.toString() === currentSiteId);
        if (site) {
          try {
            const panels = await getSitePanels(site.id);
            panels.forEach(p => allPanels.push({ ...p, siteName: site.name }));
          } catch (e) {
            console.error(`Failed to load panels for site ${site.id}`);
          }
        }
      }

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

  if (loading && diagnosticsData.length === 0 && selectedSiteId) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Evaluating diagnostic states...</span>
      </div>
    );
  }

  if (error && diagnosticsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-3">
        <span className="text-small text-error font-medium">{error}</span>
        <Button variant="outline" size="small" onClick={fetchDiagnostics}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="page-container gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-1 gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-txt leading-tight tracking-tight">Diagnostics</h1>
          <p className="text-[13px] sm:text-[14px] text-txt-muted mt-0.5 font-normal">Automated telemetry fault classification and performance inference.</p>
        </div>
        
        <div className="flex items-center gap-2.5">
          {/* Site Filter */}
          {isAdmin && (
            <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px]">
              <Filter className="h-4 w-4 text-txt-muted mr-2" />
              <select 
                className={`bg-transparent text-small font-medium focus:outline-none cursor-pointer ${!selectedSiteId ? 'text-txt-muted' : 'text-txt'}`}
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
              >
                <option value="" disabled className="bg-surface text-txt-muted">Select Site ▾</option>
                {sitesList.map(s => (
                  <option key={s.id} value={s.id} className="bg-surface text-txt">{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px]">
            <Filter className="h-4 w-4 text-txt-muted mr-2" />
            <select 
              className="bg-transparent text-small text-txt font-medium focus:outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL" className="bg-surface text-txt">All Statuses</option>
              <option value="HEALTHY" className="bg-surface text-txt">Healthy</option>
              <option value="ATTENTION" className="bg-surface text-txt">Attention</option>
              <option value="WEATHER_RELATED" className="bg-surface text-txt">Weather Related</option>
              <option value="LOCAL_SHADING" className="bg-surface text-txt">Local Shading</option>
              <option value="THERMAL_PERFORMANCE_LOSS" className="bg-surface text-txt">Thermal Loss</option>
              <option value="PANEL_UNDERPERFORMANCE" className="bg-surface text-txt">Underperformance</option>
              <option value="DEVICE_OFFLINE" className="bg-surface text-txt">Device Offline</option>
              <option value="NO_SOLAR" className="bg-surface text-txt">No Solar</option>
              <option value="NO_DATA" className="bg-surface text-txt">No Data</option>
            </select>
          </div>
        </div>
      </div>

      {!selectedSiteId && isAdmin ? (
        <div className="card flex-1 flex flex-col items-center justify-center text-center p-8">
          <Filter className="h-8 w-8 text-txt-muted opacity-30 mb-2" />
          <h3 className="text-body font-semibold text-txt mb-1">Select a Site</h3>
          <p className="text-caption text-txt-muted max-w-sm">Choose a site from the filter above to view its panel diagnostics telemetry.</p>
        </div>
      ) : (
        <div className="card p-0 flex-1 overflow-auto">
          {filteredData.length === 0 ? (
            <div className="p-8 text-center text-txt-muted text-caption">
              {loading ? 'Evaluating...' : 'No diagnostic alerts found matching criteria.'}
            </div>
          ) : (
            <table className="w-full text-left whitespace-nowrap">
              <thead className="table-header sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3">Panel</th>
                  <th className="py-2 px-3">Site</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Perf %</th>
                  <th className="py-2 px-3 text-right">Confidence</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3 text-right">Evaluated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.map((item) => {
                  const diag = item.diagnostic;
                  const status = diag ? diag.status : 'NO_DATA';
                  const isNighttime = diag ? (diag.expected_power_w === 0) : false;
                  
                  let perfDisplay = '—';
                  if (diag && diag.performance_percentage != null && !isNighttime) {
                    perfDisplay = diag.performance_percentage.toFixed(1) + '%';
                  }

                  let confDisplay = '—';
                  if (diag && diag.diagnostic_confidence != null) {
                    confDisplay = (diag.diagnostic_confidence * 100).toFixed(0) + '%';
                  }

                  const reason = diag?.reason || (status === 'NO_SOLAR' ? 'Normal nighttime' : 'Operating nominal');
                  const lastEval = diag ? new Date(diag.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '—';

                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => navigate(`/panels/${item.id}/diagnostics`)}
                      className="table-row cursor-pointer text-caption"
                    >
                      <td className="table-cell font-medium text-txt">{item.name}</td>
                      <td className="table-cell-muted">{item.siteName}</td>
                      <td className="table-cell text-center">
                        <StatusBadge status={status} />
                      </td>
                      <td className="table-cell text-right font-mono text-txt">{perfDisplay}</td>
                      <td className="table-cell text-right font-mono text-txt-secondary">{confDisplay}</td>
                      <td className="table-cell-muted truncate max-w-xs" title={reason}>{reason}</td>
                      <td className="table-cell-muted font-mono text-right text-[11px]">{lastEval}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default Diagnostics;
