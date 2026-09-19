import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeviceMappings, createDeviceMapping } from '../../api/admin_iot';
import { getSites } from '../../api/sites';
import { getDeviceStatus } from '../../api/iot';
import { Loader2, ArrowLeft, Cpu, Activity, Clock, Link2, Plus, Edit2, Trash2 } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { AssignSiteModal } from './AssignSiteModal';
import { MapChannelModal } from './MapChannelModal';

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

const DeviceDetails = () => {
  const { deviceUid } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [device, setDevice] = useState(null);
  const [status, setStatus] = useState(null);
  const [site, setSite] = useState(null);
  const [mappings, setMappings] = useState([]);
  
  const [isAssignSiteOpen, setIsAssignSiteOpen] = useState(false);
  const [isMapChannelOpen, setIsMapChannelOpen] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // The backend actually does not have GET /admin/iot/devices/{device_uid}
      // Let me just fetch all and find it
      const { getAdminDevices } = await import('../../api/admin_iot');
      const devs = await getAdminDevices();
      const dev = devs.find(d => d.device_uid === deviceUid);
      if (!dev) throw new Error("Device not found");
      
      setDevice(dev);

      if (dev.site_id) {
        const sites = await getSites();
        const s = sites.find(s => s.id === dev.site_id);
        setSite(s || null);
      } else {
        setSite(null);
      }

      const maps = await getDeviceMappings(deviceUid).catch(() => []);
      setMappings(maps);

      const stat = await getDeviceStatus(deviceUid).catch(() => null);
      setStatus(stat || { is_online: false, device_status: dev.status, last_seen: dev.last_seen });
      
    } catch (err) {
      console.error(err);
      setError('Unable to load device details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [deviceUid]);

  const handleRemoveMapping = async (m) => {
    if (!window.confirm(`Are you sure you want to deactivate mapping for CH${m.channel_number}?`)) return;
    try {
      await createDeviceMapping(deviceUid, {
        panel_id: m.panel_id,
        channel_number: m.channel_number,
        is_active: false
      });
      fetchDetails();
    } catch (e) {
      alert("Failed to deactivate mapping: " + (e.response?.data?.detail || e.message));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-txt-muted text-body">Connecting to device...</span>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-error text-body font-semibold">{error || 'Device not found'}</span>
        <Button variant="outline" onClick={() => navigate('/devices')}>Back to Devices</Button>
      </div>
    );
  }

  const isOnline = status?.is_online;
  const devStatus = device.status; // e.g. ACTIVE or UNASSIGNED

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <button 
          onClick={() => navigate('/devices')}
          className="p-2 hover:bg-surface-hover/20 rounded transition-colors text-txt-muted hover:text-txt"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <Cpu className="h-6 w-6 text-primary" />
            <h2 className="text-section font-sans font-semibold text-txt leading-tight">{device.device_uid}</h2>
            <StatusBadge status={isOnline ? 'ONLINE' : 'OFFLINE'} />
          </div>
          <span className="text-small text-txt-muted font-mono mt-1">
            Type: {device.device_type} | Firmware: {device.firmware_version}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 shrink-0">
         {/* KPI Cards */}
         <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
           <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Device Status</span>
           <span className={`text-body font-bold mt-1 ${devStatus === 'ACTIVE' ? 'text-primary' : 'text-warning'}`}>
             {devStatus}
           </span>
         </div>
         <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
           <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Assigned Site</span>
           <span className="text-body font-bold mt-1 text-txt">
             {site ? site.name : '—'}
           </span>
         </div>
         <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
           <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Mapped Channels</span>
           <span className="text-body font-bold mt-1 text-txt">
             {mappings.filter(m => m.is_active).length}
           </span>
         </div>
         <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
           <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Last Seen</span>
           <div className="flex items-center gap-2 mt-1">
             <Clock className="h-4 w-4 text-txt-muted" />
             <span className="text-body font-mono text-txt">{formatLastSeen(status?.last_seen)}</span>
           </div>
         </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4">
        
        {/* Site Assignment */}
        <div className="border border-border bg-surface rounded p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="text-small font-semibold text-txt uppercase tracking-wider">Site Assignment</span>
            </div>
            {isAdmin && (
              <Button size="small" variant="outline" onClick={() => setIsAssignSiteOpen(true)}>
                {site ? 'Change Site' : 'Assign Site'}
              </Button>
            )}
          </div>
          
          {site ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-small border-b border-border/50 pb-2">
                <span className="text-txt-muted">Current Site</span>
                <button onClick={() => navigate(`/sites/${site.id}`)} className="text-primary font-medium hover:underline text-right">{site.name}</button>
              </div>
            </div>
          ) : (
            <span className="text-small text-txt-muted">This device is currently unassigned. Assign it to a site to begin mapping channels.</span>
          )}
        </div>

        {/* Channel Mappings */}
        <div className="border border-border bg-surface rounded flex flex-col flex-1 min-h-0">
          <div className="px-4 py-3 border-b border-border bg-surface-hover shrink-0 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-warning" />
              <span className="text-small font-semibold text-txt uppercase tracking-wider">Channel Mappings</span>
            </div>
            {isAdmin && site && (
              <Button size="small" onClick={() => setIsMapChannelOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Mapping
              </Button>
            )}
          </div>
          
          <div className="p-0 flex flex-col flex-1 overflow-y-auto">
            {!site ? (
              <div className="p-6 text-center text-txt-muted text-small">
                Assign a site first to map channels.
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="table-header">
                  <tr>
                    <th className="py-2 px-4">Channel</th>
                    <th className="py-2 px-4">Panel</th>
                    <th className="py-2 px-4">Status</th>
                    {isAdmin && <th className="py-2 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[1, 2, 3, 4].map((ch) => {
                    const mapping = mappings.find(m => m.channel_number === ch && m.is_active);
                    
                    return (
                      <tr key={ch} className="table-row text-caption">
                        <td className="table-cell font-mono font-medium text-txt px-4">
                          CH{ch}
                        </td>
                        <td className="table-cell px-4">
                          {mapping ? (
                            <button onClick={() => navigate(`/panels/${mapping.panel_id}`)} className="text-primary font-medium hover:underline">
                              P{mapping.panel_id.toString().padStart(2, '0')} / {mapping.panel_name}
                            </button>
                          ) : (
                            <span className="text-txt-muted">—</span>
                          )}
                        </td>
                        <td className="table-cell px-4">
                          {mapping ? (
                            <span className="text-[10px] font-mono text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider">
                              Mapped
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-txt-muted bg-surface-secondary border border-border px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider">
                              Not Mapped
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="table-cell px-4 text-right">
                            {mapping && (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleRemoveMapping(mapping)} className="p-1.5 text-txt-muted hover:text-error hover:bg-error/10 rounded transition-colors" title="Remove Mapping">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <AssignSiteModal
        isOpen={isAssignSiteOpen}
        onClose={() => setIsAssignSiteOpen(false)}
        onSuccess={fetchDetails}
        deviceUid={deviceUid}
      />
      
      <MapChannelModal
        isOpen={isMapChannelOpen}
        onClose={() => setIsMapChannelOpen(false)}
        onSuccess={fetchDetails}
        deviceUid={deviceUid}
        siteId={device?.site_id}
        existingMappings={mappings}
      />
    </div>
  );
};

export default DeviceDetails;
