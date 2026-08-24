import React from 'react';

const WeatherAndAlerts = ({ weather, alerts }) => {
  
  // Format weather value or return N/A
  const wVal = (val, suffix = '') => {
    if (val == null) return 'N/A';
    return `${val}${suffix}`;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full">
      {/* Weather Block */}
      <div className="flex-1 p-4 border border-border bg-surface rounded shadow-sm flex flex-col">
        <h3 className="text-small font-semibold text-text uppercase tracking-wider mb-4">Weather Context</h3>
        <div className="grid grid-cols-2 gap-4 mt-auto">
          <div className="flex flex-col">
            <span className="text-small text-text-muted">Temperature</span>
            <span className="text-medium font-semibold text-text">{wVal(weather?.temperature_2m, '°C')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-small text-text-muted">Humidity</span>
            <span className="text-medium font-semibold text-text">{wVal(weather?.relative_humidity_2m, '%')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-small text-text-muted">Cloud Cover</span>
            <span className="text-medium font-semibold text-text">{wVal(weather?.cloud_cover, '%')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-small text-text-muted">Precipitation</span>
            <span className="text-medium font-semibold text-text">{wVal(weather?.precipitation, ' mm')}</span>
          </div>
        </div>
      </div>

      {/* Alerts Block */}
      <div className="flex-1 p-4 border border-border bg-surface rounded shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-small font-semibold text-text uppercase tracking-wider">Active Alerts</h3>
          <span className="text-small font-medium bg-border px-2 rounded-full text-text-muted">
            {alerts?.length || 0}
          </span>
        </div>
        
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px] pr-1">
          {!alerts || alerts.length === 0 ? (
            <div className="text-small text-text-muted flex items-center justify-center h-20 bg-border/20 rounded">
              No active alerts
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="flex flex-col p-2 border border-border/50 bg-background rounded">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-small font-semibold text-status-error">{alert.fault_type}</span>
                  <span className="text-small text-text-muted font-mono">{alert.panel_name || `P${alert.panel_id}`}</span>
                </div>
                <span className="text-small text-text-muted leading-tight">{alert.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherAndAlerts;
