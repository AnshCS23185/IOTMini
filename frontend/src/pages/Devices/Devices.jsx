import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminDevices } from '../../api/admin_iot';
import { getSites } from '../../api/sites';
import { Loader2, Search, Filter, Plus } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { RegisterDeviceModal } from './RegisterDeviceModal';

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [sites, setSites] = useState([]);
  const [devicesList, setDevicesList] = useState([]);
  
  const [selectedSiteId, setSelectedSiteId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sitesList = await getSites();
      setSites(sitesList);

      const allDevices = await getAdminDevices();
      
      const { getDeviceMappings } = await import('../../api/admin_iot');
      // Fetch mappings for each device to know the panel count
      const mappedDevices = await Promise.all(
        allDevices.map(async (dev) => {
          try {
            const mappings = await getDeviceMappings(dev.device_uid);
            return { ...dev, mappings: mappings };
          } catch (e) {
            return { ...dev, mappings: [] };
          }
        })
      );
      
      setDevicesList(mappedDevices);
      
    } catch (err) {
      setError('Unable to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = devicesList.filter(item => {
    // Determine online status
    let isOnline = false;
    if (item.last_seen) {
      const now = new Date();
      const ts = new Date(item.last_seen);
      const diffMins = Math.floor((now - ts) / 1000 / 60);
      if (diffMins <= 5) isOnline = true;
    }

    if (statusFilter === 'ONLINE' && !isOnline) return false;
    if (statusFilter === 'OFFLINE' && isOnline) return false;
    
    const site = sites.find(s => s.id === item.site_id);
    if (selectedSiteId !== 'ALL' && item.site_id?.toString() !== selectedSiteId) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const uidMatch = item.device_uid?.toLowerCase().includes(q);
      const siteMatch = site?.name?.toLowerCase().includes(q);
      if (!uidMatch && !siteMatch) return false;
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
        <Button variant="outline" size="small" onClick={fetchData}>Retry</Button>
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

          {isAdmin && (
            <Button onClick={() => setIsRegisterOpen(true)} className="h-[38px]">
              <Plus className="h-4 w-4 mr-2" /> Register Device
            </Button>
          )}
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
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-center">Panels</th>
                <th className="py-2 px-3 text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredData.map((item) => {
                let isOnline = false;
                if (item.last_seen) {
                  const now = new Date();
                  const ts = new Date(item.last_seen);
                  const diffMins = Math.floor((now - ts) / 1000 / 60);
                  if (diffMins <= 5) isOnline = true;
                }
                const siteName = sites.find(s => s.id === item.site_id)?.name || '—';
                const panelCount = item.mappings ? item.mappings.length : 0; // Note: mappings might not be eagerly loaded, but we'll adapt. The backend get_all_devices does not include mappings in response_model, so it may be missing.

                return (
                  <tr 
                    key={item.id}
                    onClick={() => navigate(`/devices/${item.device_uid}`)}
                    className="table-row text-caption cursor-pointer"
                  >
                    <td className="table-cell font-mono font-medium text-txt">
                      {item.device_uid}
                    </td>
                    <td className="table-cell-muted">{item.status === 'UNASSIGNED' ? <span className="text-warning">Unassigned</span> : siteName}</td>
                    <td className="table-cell text-center">
                      <StatusBadge status={isOnline ? 'ONLINE' : 'OFFLINE'} />
                    </td>
                    <td className="table-cell-muted text-center font-mono">
                      {item.status === 'UNASSIGNED' ? '—' : (item.mappings?.length || '?')}
                    </td>
                    <td className="table-cell-muted font-mono text-right text-[11px]">
                      {formatLastSeen(item.last_seen)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <RegisterDeviceModal 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
};

export default Devices;
