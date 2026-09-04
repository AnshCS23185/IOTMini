import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { getSitePanels, getPanelDevice } from '../../api/panels';
import { getDeviceStatus } from '../../api/iot';
import { Loader2, Search, Filter } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

const formatLastSeen = (timestamp) => {
  if (!timestamp) return 'Never';
  const now = new Date();
  const ts = new Date(timestamp);
  const diffSecs = Math.floor((now - ts) / 1000);
  
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return ts.toLocaleString([], { month: 'short', day: 'numeric' });
};

const Devices = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [sites, setSites] = useState([]);
  const [devicesList, setDevicesList] = useState([]);
  
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

      for (const site of sitesList) {
        if (selectedSiteId !== 'ALL' && selectedSiteId !== site.id.toString()) continue;
        
        try {
          const panels = await getSitePanels(site.id);
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
                s = { is_online: false, device_status: d.status || 'UNKNOWN' };
              }
              
              aggregated.push({ panel: p, site, device: d, status: s });
            } else {
              aggregated.push({ panel: p, site, device: null, status: null });
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
    if (statusFilter === 'ONLINE' && !item.status?.is_online) return false;
    if (statusFilter === 'OFFLINE' && item.status?.is_online) return false;
    
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
      <div className="flex flex-col items-center justify-center h-full w-full gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Loading IoT devices...</span>
      </div>
    );
  }

  if (error && devicesList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-3">
        <span className="text-small text-error font-medium">{error}</span>
        <Button variant="outline" size="small" onClick={fetchDevices}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="page-container gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-1 gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-txt leading-tight tracking-tight">IoT Devices</h1>
          <p className="text-[13px] sm:text-[14px] text-txt-muted mt-0.5 font-normal">Hardware gateway statuses and telemetry transceivers.</p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px] w-56">
            <Search className="h-4 w-4 text-txt-muted mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Search UID, site..." 
              className="bg-transparent text-small text-txt focus:outline-none w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px]">
            <Filter className="h-4 w-4 text-txt-muted mr-2" />
            <select 
              className="bg-transparent text-small text-txt font-medium focus:outline-none cursor-pointer"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
            >
              <option value="ALL" className="bg-surface text-txt">All Sites</option>
              {sites.map(s => (
                <option key={s.id} value={s.id} className="bg-surface text-txt">{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-surface border border-border rounded-lg px-3 h-[38px]">
            <Filter className="h-4 w-4 text-txt-muted mr-2" />
            <select 
              className="bg-transparent text-small text-txt font-medium focus:outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL" className="bg-surface text-txt">All Statuses</option>
              <option value="ONLINE" className="bg-surface text-txt">Online</option>
              <option value="OFFLINE" className="bg-surface text-txt">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card p-0 flex-1 overflow-auto">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-txt-muted text-caption">
            {loading ? 'Refreshing devices...' : 'No matching IoT devices found.'}
          </div>
        ) : (
          <table className="w-full text-left whitespace-nowrap">
            <thead className="table-header sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3">Device UID</th>
                <th className="py-2 px-3">Site</th>
                <th className="py-2 px-3">Panel</th>
                <th className="py-2 px-3 text-center">Type</th>
                <th className="py-2 px-3 text-center">Firmware</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredData.map((item, i) => {
                const hasDevice = !!item.device;
                
                return (
                  <tr 
                    key={`${item.panel.id}-${i}`}
                    onClick={() => {
                      if (hasDevice) navigate(`/devices/${item.device.device_uid}?panelId=${item.panel.id}`);
                    }}
                    className={`table-row text-caption ${hasDevice ? 'cursor-pointer' : ''}`}
                  >
                    <td className="table-cell font-mono font-medium text-txt">
                      {hasDevice ? item.device.device_uid : <span className="text-txt-muted">—</span>}
                    </td>
                    <td className="table-cell-muted">{item.site.name}</td>
                    <td className="table-cell font-medium text-txt">P{item.panel.id.toString().padStart(2, '0')}</td>
                    <td className="table-cell text-center">
                      <span className="text-[10px] font-mono text-txt-secondary bg-surface-secondary border border-border px-1.5 py-0.5 rounded">
                        {hasDevice ? item.device.device_type : 'N/A'}
                      </span>
                    </td>
                    <td className="table-cell-muted text-center font-mono text-[11px]">
                      {hasDevice ? `v${item.device.firmware_version}` : '—'}
                    </td>
                    <td className="table-cell text-center">
                      {hasDevice ? (
                        <StatusBadge status={item.status?.is_online ? 'ONLINE' : 'OFFLINE'} />
                      ) : <span className="text-txt-muted">—</span>}
                    </td>
                    <td className="table-cell-muted font-mono text-right text-[11px]">
                      {hasDevice ? formatLastSeen(item.status?.last_seen) : '—'}
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
