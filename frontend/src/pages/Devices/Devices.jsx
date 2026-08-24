import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { getSitePanels, getPanelDevice } from '../../api/panels';
import { getDeviceStatus } from '../../api/iot';
import { Loader2, Search, Filter } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';

const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'Never connected';
  const now = new Date();
  const ts = new Date(timestamp);
  const diffSecs = Math.floor((now - ts) / 1000);
  
  if (diffSecs < 60) return `${diffSecs} sec ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return ts.toLocaleString([], { month: 'short', day: 'numeric' });
};

const Devices = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [sites, setSites] = useState([]);
  const [devicesList, setDevicesList] = useState([]); // Array of { panel, site, device, status }
  
  const [selectedSiteId, setSelectedSiteId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sitesList = await getSites();
      setSites(sitesList);

      let aggregated = [];

      // 1. Fetch Panels for each site
      for (const site of sitesList) {
        if (selectedSiteId !== 'ALL' && selectedSiteId !== site.id.toString()) continue;
        
        try {
          const panels = await getSitePanels(site.id);
          
          // 2. Fetch Device & Status for each Panel
          const devicePromises = panels.map(p => getPanelDevice(p.id).catch(() => null));
          const devResults = await Promise.all(devicePromises);
          
          for (let i = 0; i < panels.length; i++) {
            const p = panels[i];
            const d = devResults[i];
            
            if (d && d.device_uid) {
              let s = null;
              try {
                 s = await getDeviceStatus(d.device_uid);
              } catch (e) {
                 // ignore status fetch fail
                 s = { is_online: false, device_status: d.status || 'UNKNOWN' };
              }
              
              aggregated.push({
                panel: p,
                site: site,
                device: d,
                status: s
              });
            } else {
              aggregated.push({
                panel: p,
                site: site,
                device: null,
                status: null
              });
            }
          }
        } catch (e) {
          console.error(`Failed to load data for site ${site.id}`);
        }
      }
      
      setDevicesList(aggregated);
    } catch (err) {
      setError('Unable to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [selectedSiteId]);

  const filteredData = devicesList.filter(item => {
    // Status Filter
    if (statusFilter === 'ONLINE' && !item.status?.is_online) return false;
    if (statusFilter === 'OFFLINE' && item.status?.is_online) return false;
    
    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const uidMatch = item.device?.device_uid?.toLowerCase().includes(q);
      const siteMatch = item.site?.name?.toLowerCase().includes(q);
      const panelMatch = item.panel?.name?.toLowerCase().includes(q);
      if (!uidMatch && !siteMatch && !panelMatch) return false;
    }
    
    return true;
  });

  if (loading && devicesList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-text-muted text-medium">Loading IoT devices...</span>
      </div>
    );
  }

  if (error && devicesList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-status-error text-medium font-semibold">{error}</span>
        <button onClick={fetchDevices} className="border border-border px-4 py-2 rounded text-text hover:bg-border/20 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-4 gap-4">
        <div>
          <h2 className="text-large font-display font-semibold text-text leading-tight">IoT Devices</h2>
          <span className="text-small text-text-muted">Global overview of authorized IoT hardware</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="flex items-center border border-border bg-surface rounded px-3 py-1.5 w-48">
            <Search className="h-4 w-4 text-text-muted mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Search UID, Site..." 
              className="bg-transparent text-small text-text focus:outline-none w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Site Filter */}
          <div className="flex items-center border border-border bg-surface rounded px-3 py-1.5">
            <Filter className="h-4 w-4 text-text-muted mr-2" />
            <select 
              className="bg-transparent text-small text-text font-medium focus:outline-none cursor-pointer"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="ALL" className="bg-surface">All Sites</option>
              {sites.map(s => (
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
              <option value="ONLINE" className="bg-surface">Online</option>
              <option value="OFFLINE" className="bg-surface">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 min-h-0 overflow-auto bg-surface border border-border rounded shadow-sm">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {loading ? 'Refreshing devices...' : 'No IoT devices available.'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-border/30 text-text-muted text-[11px] uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                <th className="py-3 px-4 font-medium border-b border-border">Device</th>
                <th className="py-3 px-4 font-medium border-b border-border">Site</th>
                <th className="py-3 px-4 font-medium border-b border-border">Panel</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Type</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Firmware</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Status</th>
                <th className="py-3 px-4 font-medium border-b border-border text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, i) => {
                const hasDevice = !!item.device;
                
                return (
                  <tr 
                    key={`${item.panel.id}-${i}`}
                    onClick={() => {
                      if (hasDevice) navigate(`/devices/${item.device.device_uid}?panelId=${item.panel.id}`);
                    }}
                    className={`border-b border-border/50 transition-colors ${hasDevice ? 'hover:bg-border/20 cursor-pointer' : ''} ${i % 2 === 0 ? '' : 'bg-border/5'}`}
                  >
                    <td className="py-3 px-4 text-text font-semibold text-small font-mono">
                      {hasDevice ? item.device.device_uid : <span className="text-text-muted">N/A</span>}
                    </td>
                    <td className="py-3 px-4 text-text-muted text-small">{item.site.name}</td>
                    <td className="py-3 px-4 text-text-muted text-small font-semibold">P{item.panel.id.toString().padStart(2, '0')}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] font-mono text-text-muted bg-border/30 px-2 py-0.5 rounded">
                        {hasDevice ? item.device.device_type : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-small font-mono text-text-muted">
                      {hasDevice ? `v${item.device.firmware_version}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {hasDevice ? (
                         <StatusBadge status={item.status?.is_online ? 'ONLINE' : 'OFFLINE'} />
                      ) : <span className="text-text-muted text-small">N/A</span>}
                    </td>
                    <td className="py-3 px-4 text-text-muted text-small text-right">
                      {hasDevice ? formatLastSeen(item.status?.last_seen) : 'N/A'}
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

export default Devices;
