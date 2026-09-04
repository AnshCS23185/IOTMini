import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { getDashboard, getAlerts } from '../../api/dashboard';
import { getOrganizations } from '../../api/admin';
import { Search, MoreVertical, Plus, Building, Zap, Activity, CheckCircle2, AlertCircle, Settings, Trash2, Grid2X2 } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { NewClientModal } from '../../components/sites/NewClientModal';

const Sites = () => {
  const [sitesData, setSitesData] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sitesList, orgsList] = await Promise.all([
        getSites(),
        getOrganizations().catch(() => [])
      ]);
      setOrganizations(orgsList);
      const richSites = await Promise.all(sitesList.map(async (site) => {
        try {
          const dash = await getDashboard(site.id);
          const alerts = await getAlerts(site.id);
          const org = orgsList.find(o => o.id === site.organization_id);
          return { ...site, orgName: org ? org.name : 'Unknown Client', dash, activeAlerts: alerts?.length || 0 };
        } catch (e) {
          return { ...site, orgName: 'Unknown Client', dash: null, activeAlerts: 0 };
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

  useEffect(() => { fetchData(); }, []);

  const filteredSites = sitesData.filter(site => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      site.name.toLowerCase().includes(q) || 
      (site.location && site.location.toLowerCase().includes(q)) ||
      (site.orgName && site.orgName.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || site.status === statusFilter;
    const matchesOrg = orgFilter === 'ALL' || String(site.organization_id) === String(orgFilter);

    return matchesSearch && matchesStatus && matchesOrg;
  });

  const totalClients = new Set(sitesData.map(s => s.organization_id)).size;
  const activeSites = sitesData.filter(s => s.status === 'ACTIVE').length;
  const totalPanels = sitesData.reduce((acc, curr) => acc + (curr.dash?.total_panels || 0), 0);
  const currentOutput = sitesData.reduce((acc, curr) => acc + (curr.dash?.current_power_w || 0), 0);
  const formattedOutput = currentOutput >= 1000 ? `${(currentOutput/1000).toFixed(1)} kW` : `${currentOutput.toFixed(1)} W`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-[#B86F50] border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Loading sites...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-3">
        <AlertCircle className="h-6 w-6 text-error" />
        <span className="text-small text-error font-medium">{error}</span>
        <Button variant="outline" size="small" onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  const stats = [
    { label: 'Clients', value: totalClients, icon: Building, iconColor: 'text-[#D59D80]', iconBg: 'bg-[rgba(213,157,128,0.10)]' },
    { label: 'Sites', value: sitesData.length, icon: Activity, iconColor: 'text-[#6C8F8A]', iconBg: 'bg-[rgba(16,76,100,0.16)]' },
    { label: 'Panels', value: totalPanels, icon: Grid2X2, iconColor: 'text-[#C6C0D0]', iconBg: 'bg-[rgba(198,192,208,0.10)]' },
    { label: 'Active', value: activeSites, icon: CheckCircle2, iconColor: 'text-success', iconBg: 'bg-success/10' },
    { label: 'Offline', value: sitesData.length - activeSites, icon: AlertCircle, iconColor: 'text-txt-muted', iconBg: 'bg-surface-secondary' },
    { label: 'Output', value: formattedOutput, icon: Zap, iconColor: 'text-[#D59D80]', iconBg: 'bg-[rgba(213,157,128,0.10)]' },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 1. Page Title & Action */}
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-txt leading-tight tracking-tight">Sites</h1>
          <p className="text-[13px] sm:text-[14px] text-txt-muted mt-0.5 font-normal">Manage clients and their solar installations.</p>
        </div>
        <Button variant="primary" size="medium" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          <span>New Client</span>
        </Button>
      </div>

      {/* 2. Stat Cards - Transparent / Black, subtle border, no gray fill */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 shrink-0">
        {stats.map((s) => (
          <div 
            key={s.label} 
            className="bg-surface border border-border rounded-lg p-3 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className={`h-8 w-8 rounded-md flex items-center justify-center ${s.iconBg}`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} strokeWidth={1.8} />
              </div>
              <span className="text-caption font-medium text-txt-muted">{s.label}</span>
            </div>
            <span className="text-[20px] sm:text-[22px] font-bold text-txt tracking-tight font-mono">{s.value}</span>
          </div>
        ))}
      </div>

      {/* 3. Filters - Pure black, 38px, no gray boxes */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4 shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-txt-muted" />
          <input 
            type="text" 
            placeholder="Search clients or sites..." 
            className="input-base pl-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select 
          className="input-base px-3 w-36 cursor-pointer"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Status: All</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <select 
          className="input-base px-3 w-44 cursor-pointer"
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
        >
          <option value="ALL">Org: All</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>

      {/* 4. Table - Direct on black page, no gray table container */}
      <div className="flex-1 min-h-0 overflow-auto border border-border rounded-lg bg-surface">
        {filteredSites.length === 0 ? (
          <div className="p-12 text-center text-txt-muted text-small">
            {searchQuery ? 'No sites match your search filter.' : 'No clients or sites available.'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="table-header sticky top-0 z-10">
                <th className="py-3 px-3.5 font-semibold" style={{ width: '24%' }}>Client / Site</th>
                <th className="py-3 px-3.5 font-semibold" style={{ width: '20%' }}>Location</th>
                <th className="py-3 px-3.5 font-semibold text-right" style={{ width: '10%' }}>Panels</th>
                <th className="py-3 px-3.5 font-semibold text-right" style={{ width: '12%' }}>Output</th>
                <th className="py-3 px-3.5 font-semibold text-right" style={{ width: '10%' }}>Perf.</th>
                <th className="py-3 px-3.5 font-semibold text-center" style={{ width: '8%' }}>Alerts</th>
                <th className="py-3 px-3.5 font-semibold" style={{ width: '12%' }}>Status</th>
                <th className="py-3 px-3.5 text-center" style={{ width: '4%' }}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSites.map((site) => {
                const dash = site.dash;
                const isNight = dash?.expected_power_w === 0;
                const power = dash ? (isNight ? '0 W' : (dash.current_power_w >= 1000 ? `${(dash.current_power_w/1000).toFixed(1)} kW` : `${dash.current_power_w.toFixed(1)} W`)) : '—';
                const perf = dash ? (isNight ? '—' : `${dash.performance_percentage?.toFixed(1)}%`) : '—';
                const panels = dash?.total_panels ?? '—';
                const alerts = site.activeAlerts;
                
                return (
                  <tr 
                    key={site.id} 
                    onClick={() => navigate(`/sites/${site.id}`)} 
                    className="table-row cursor-pointer group h-[54px]"
                  >
                    <td className="table-cell">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-txt leading-snug">{site.orgName}</span>
                        <span className="text-caption text-txt-muted">{site.name}</span>
                      </div>
                    </td>
                    <td className="table-cell-muted truncate max-w-[200px]" title={site.location}>{site.location || '—'}</td>
                    <td className="table-cell text-right font-mono font-medium text-txt">{panels}</td>
                    <td className="table-cell text-right font-mono font-medium text-txt">{power}</td>
                    <td className="table-cell text-right font-mono font-medium text-txt">
                      <span className={dash && !isNight && dash.performance_percentage < 60 ? 'text-error font-semibold' : ''}>{perf}</span>
                    </td>
                    <td className="table-cell text-center">
                      {alerts > 0 ? (
                        <span className="inline-flex items-center justify-center bg-error/15 text-error border border-error/25 text-caption font-bold h-5 min-w-[20px] px-1.5 rounded-full">{alerts}</span>
                      ) : (
                        <span className="text-txt-muted opacity-40">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={site.status || 'UNKNOWN'} />
                    </td>
                    <td className="table-cell text-center relative">
                      <button 
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${openMenuId === site.id ? 'text-txt bg-surface-hover' : 'text-txt-muted group-hover:text-txt hover:bg-surface-hover'}`}
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === site.id ? null : site.id); }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenuId === site.id && (
                        <div 
                          className="absolute right-6 top-1/2 -translate-y-1/2 w-44 bg-surface-elevated border border-border rounded-lg shadow-2xl z-50 py-1" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button className="w-full text-left px-3 py-2 text-small hover:bg-surface-hover flex items-center gap-2 text-txt cursor-pointer" onClick={() => navigate(`/sites/${site.id}/overview`)}>
                            <Activity className="h-3.5 w-3.5 text-txt-muted" /> Details
                          </button>
                          <button className="w-full text-left px-3 py-2 text-small hover:bg-surface-hover flex items-center gap-2 text-txt cursor-pointer" onClick={() => navigate(`/sites/${site.id}/configuration`)}>
                            <Settings className="h-3.5 w-3.5 text-txt-muted" /> Config
                          </button>
                          <div className="h-px bg-border my-1" />
                          <button className="w-full text-left px-3 py-2 text-small text-error hover:bg-error/10 flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/sites/${site.id}/configuration`)}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <NewClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} />
    </div>
  );
};

export default Sites;
