import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getDeviceStatus, getLatestReading, getHistoricalReadings } from '../../api/iot';
import { getPanel, getSitePanels } from '../../api/panels';
import { getSites } from '../../api/sites';
import { Loader2, ArrowLeft, Cpu, Activity, Zap, Thermometer, Droplets, Link2, Clock } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Button } from '../../components/ui/Button';

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

// Custom tooltip for Sensor Chart
const SensorTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-elevated border border-border p-2.5 shadow-2xl rounded-md flex flex-col gap-1 text-caption">
        <span className="font-semibold text-txt mb-0.5">{new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="flex justify-between gap-4">
          <span className="text-primary font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span> Power
          </span>
          <span className="font-mono text-txt">{payload[0].value.toFixed(1)} W</span>
        </div>
      </div>
    );
  }
  return null;
};

const DeviceDetails = () => {
  const { deviceUid } = useParams();
  const [searchParams] = useSearchParams();
  const panelIdParam = searchParams.get('panelId');
  
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [status, setStatus] = useState(null);
  const [panel, setPanel] = useState(null);
  const [site, setSite] = useState(null);
  
  const [latestReading, setLatestReading] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  
  const [deviceInfo, setDeviceInfo] = useState(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stat = await getDeviceStatus(deviceUid);
      setStatus(stat);
      
      // Since backend doesn't give us device object directly without panel ID, 
      // we use panelId if provided in query params.
      if (panelIdParam) {
        const pId = Number(panelIdParam);
        const p = await getPanel(pId);
        setPanel(p);
        
        // Grab site
        const sites = await getSites();
        const s = sites.find(s => s.id === p.site_id);
        if (s) setSite(s);
        
        // Grab sensor data
        try {
          const latest = await getLatestReading(pId);
          setLatestReading(latest);
        } catch (e) {
          // ignore if no latest reading
        }
        
        try {
          const history = await getHistoricalReadings(pId, 50); // limit to recent 50
          setHistoricalData(history.reverse()); // chronological order
        } catch (e) {
          // ignore
        }
      }
      
    } catch (err) {
      console.error(err);
      setError('Unable to load device details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [deviceUid, panelIdParam]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <span className="text-txt-muted text-body">Connecting to device...</span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <span className="text-error text-body font-semibold">{error || 'Device not found'}</span>
        <Button variant="outline" onClick={() => navigate('/devices')}>Back to Devices</Button>
      </div>
    );
  }

  const isOnline = status.is_online;
  const hasData = latestReading != null;
  const devStatus = status.device_status; // e.g. ACTIVE

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
            <h2 className="text-section font-sans font-semibold text-txt leading-tight">{status.device_uid}</h2>
            <StatusBadge status={isOnline ? 'ONLINE' : 'OFFLINE'} />
          </div>
          <span className="text-small text-txt-muted font-mono mt-1">
            Status: {devStatus} | Last Seen: {status.last_seen ? new Date(status.last_seen).toLocaleString() : 'N/A'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 shrink-0">
         {/* KPI Cards */}
         <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
           <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Connection</span>
           <div className="mt-1"><StatusBadge status={isOnline ? 'ONLINE' : 'OFFLINE'} /></div>
         </div>
         <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
           <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Last Seen</span>
           <div className="flex items-center gap-2 mt-1">
             <Clock className="h-4 w-4 text-txt-muted" />
             <span className="text-body font-mono text-txt">{formatLastSeen(status.last_seen)}</span>
           </div>
         </div>
         <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
           <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Sensor Data</span>
           <span className={`text-body font-bold mt-1 ${hasData ? 'text-info' : 'text-txt-muted'}`}>
             {hasData ? 'AVAILABLE' : 'N/A'}
           </span>
         </div>
         <div className="border border-border bg-surface p-3 rounded flex flex-col justify-between">
           <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Device Status</span>
           <span className={`text-body font-bold mt-1 ${devStatus === 'ACTIVE' ? 'text-primary' : 'text-txt-muted'}`}>
             {devStatus}
           </span>
         </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
        
        {/* Left Column: Latest Reading & Association */}
        <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
           
           {/* Association Context */}
           <div className="border border-border bg-surface rounded p-4 flex flex-col gap-3">
             <div className="flex items-center gap-2 mb-1">
               <Link2 className="h-4 w-4 text-primary" />
               <span className="text-small font-semibold text-txt uppercase tracking-wider">Association</span>
             </div>
             
             {panel && site ? (
               <div className="flex flex-col gap-2">
                 <div className="flex justify-between items-center text-small border-b border-border/50 pb-2">
                   <span className="text-txt-muted">Site</span>
                   <button onClick={() => navigate(`/sites/${site.id}`)} className="text-primary font-medium hover:underline text-right">{site.name}</button>
                 </div>
                 <div className="flex justify-between items-center text-small border-b border-border/50 pb-2">
                   <span className="text-txt-muted">Panel</span>
                   <button onClick={() => navigate(`/panels/${panel.id}`)} className="text-primary font-medium hover:underline text-right">{panel.name}</button>
                 </div>
               </div>
             ) : (
               <span className="text-small text-txt-muted">No panel associated or provided in request.</span>
             )}
           </div>

           {/* Latest Sensor Reading */}
           <div className="border border-border bg-surface rounded flex flex-col flex-1 min-h-0">
             <div className="px-4 py-3 border-b border-border bg-surface-hover shrink-0 flex items-center gap-2">
               <Activity className="h-4 w-4 text-warning" />
               <span className="text-small font-semibold text-txt uppercase tracking-wider">Latest Sensor Reading</span>
             </div>
             
             <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
               {hasData ? (
                 <>
                   <div className="flex justify-between text-small border-b border-border/50 pb-2">
                     <span className="text-txt-muted">Voltage</span>
                     <span className="font-mono text-txt">{latestReading.voltage != null ? `${latestReading.voltage.toFixed(2)} V` : 'N/A'}</span>
                   </div>
                   <div className="flex justify-between text-small border-b border-border/50 pb-2">
                     <span className="text-txt-muted">Current</span>
                     <span className="font-mono text-txt">{latestReading.current != null ? `${latestReading.current.toFixed(2)} A` : 'N/A'}</span>
                   </div>
                   <div className="flex justify-between text-small border-b border-border/50 pb-2">
                     <span className="text-txt-muted font-bold">Power</span>
                     <span className="font-mono text-primary font-bold">{latestReading.power != null ? `${latestReading.power.toFixed(1)} W` : 'N/A'}</span>
                   </div>
                   <div className="flex justify-between text-small border-b border-border/50 pb-2">
                     <span className="text-txt-muted flex items-center gap-1"><Zap className="h-3 w-3" /> Light Int.</span>
                     <span className="font-mono text-txt">{latestReading.light_intensity != null ? latestReading.light_intensity.toFixed(0) : 'N/A'}</span>
                   </div>
                   <div className="flex justify-between text-small border-b border-border/50 pb-2">
                     <span className="text-txt-muted flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temperature</span>
                     <span className="font-mono text-txt">{latestReading.temperature != null ? `${latestReading.temperature}°C` : 'N/A'}</span>
                   </div>
                   <div className="flex justify-between text-small border-b border-border/50 pb-2">
                     <span className="text-txt-muted flex items-center gap-1"><Droplets className="h-3 w-3" /> Humidity</span>
                     <span className="font-mono text-txt">{latestReading.humidity != null ? `${latestReading.humidity}%` : 'N/A'}</span>
                   </div>
                   
                   <div className="mt-2 text-right">
                     <span className="text-caption text-txt-muted font-mono block">
                       Recv: {new Date(latestReading.timestamp).toLocaleTimeString()}
                     </span>
                   </div>
                 </>
               ) : (
                 <div className="text-center text-txt-muted text-small mt-4">
                   No sensor data available
                 </div>
               )}
             </div>
           </div>
        </div>

        {/* Right Column: Historical Sensor Trend */}
        <div className="flex-1 flex flex-col min-h-0 border border-border bg-surface rounded overflow-hidden shadow-sm">
           <div className="px-4 py-3 border-b border-border bg-surface-hover shrink-0">
             <span className="text-small font-semibold text-txt uppercase tracking-wider">Power Sensor Trend</span>
           </div>
           <div className="flex-1 min-h-0 p-4">
              {historicalData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--pr)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--pr)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--bd)" opacity={0.6} />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      tick={{ fontSize: 10, fill: 'var(--tx-m)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: 'var(--tx-m)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<SensorTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="power" 
                      stroke="var(--pr)" 
                      strokeWidth={1.5}
                      fillOpacity={1} 
                      fill="url(#colorPower)" 
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-txt-muted text-small">
                  No historical sensor data
                </div>
              )}
           </div>
        </div>
        
      </div>
    </div>
  );
};

export default DeviceDetails;
