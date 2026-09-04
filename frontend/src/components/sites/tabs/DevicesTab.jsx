import React, { useState, useEffect } from 'react';
import { Monitor, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/Button';

export const DevicesTab = ({ site }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDevices = () => {
    setLoading(true);
    setTimeout(() => {
      setDevices([]);
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    fetchDevices();
  }, [site]);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-body font-semibold text-txt">Connected IoT Devices</h3>
        <Button size="small" variant="outline" onClick={fetchDevices} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="card p-0 flex-1 overflow-auto">
        {devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-txt-muted p-4">
            <Monitor className="h-6 w-6 mb-2 opacity-30" />
            <span className="text-caption font-medium text-txt">No IoT devices linked</span>
            <span className="text-[11px] text-txt-muted mt-0.5">Telemetry devices auto-provision when firmware pairs with panel serials.</span>
          </div>
        ) : (
          <table className="w-full text-left whitespace-nowrap">
            <thead className="table-header">
              <tr>
                <th className="py-2 px-3 w-[30%]">Device ID</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Last Seen</th>
                <th className="py-2 px-3">Associated Panel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Dynamic rows */}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
