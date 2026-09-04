import React from 'react';

const createPlaceholder = (title, description) => () => (
  <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-surface border border-border rounded">
    <h2 className="text-section font-sans font-semibold text-txt mb-2">{title}</h2>
    <p className="text-body text-txt-muted">{description}</p>
  </div>
);

export const Dashboard = createPlaceholder('Dashboard', 'System overview and key metrics will appear here.');
export const Sites = createPlaceholder('Sites', 'Site management and regional performance data.');
export const Panels = createPlaceholder('Panels', 'Individual panel monitoring and metrics.');
export const Performance = createPlaceholder('Performance', 'Advanced performance analysis and reporting.');
export const Diagnostics = createPlaceholder('Diagnostics', 'System diagnostics, logs, and troubleshooting tools.');
export const Alerts = createPlaceholder('Alerts', 'Active and historical system alerts.');
export const Devices = createPlaceholder('Devices', 'IoT device management and status.');
export const Hardware = createPlaceholder('Hardware Control', 'Direct hardware interaction and command interface.');
export const Settings = createPlaceholder('Settings', 'Platform and user preference configuration.');
