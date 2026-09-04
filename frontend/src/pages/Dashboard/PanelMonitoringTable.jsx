import React from 'react';
import { StatusBadge } from '../../components/ui/StatusBadge';

const PanelMonitoringTable = ({ panels }) => {
  if (!panels || panels.length === 0) {
    return (
      <div className="p-8 text-center text-txt-muted bg-surface border border-border rounded">
        No panels configured. Add a panel to begin monitoring.
      </div>
    );
  }

  return (
    <div className="border border-border rounded overflow-hidden bg-surface shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-border/30 text-txt-muted text-small uppercase tracking-wider">
            <th className="py-2 px-4 font-medium border-b border-border">Panel</th>
            <th className="py-2 px-4 font-medium border-b border-border text-right">Actual (W)</th>
            <th className="py-2 px-4 font-medium border-b border-border text-right">Expected (W)</th>
            <th className="py-2 px-4 font-medium border-b border-border text-right">Perf %</th>
            <th className="py-2 px-4 font-medium border-b border-border text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {panels.map((panel, i) => {
            const isNighttime = panel.expected_power_w === 0;
            const isNoData = panel.actual_power_w == null;
            
            // Format numbers
            const actual = isNoData ? 'N/A' : (isNighttime ? '0.0' : panel.actual_power_w.toFixed(1));
            const expected = panel.expected_power_w.toFixed(1);
            const perf = (isNighttime || isNoData || panel.performance_percentage == null) 
              ? 'N/A' 
              : `${panel.performance_percentage.toFixed(1)}%`;
              
            const status = isNighttime ? 'NO_SOLAR' : (isNoData ? 'NO_DATA' : panel.status);

            return (
              <tr key={panel.id} className={`border-b border-border/50 hover:bg-surface-hover/10 ${i % 2 === 0 ? '' : 'bg-border/5'}`}>
                <td className="py-2 px-4 text-txt font-medium text-small">{panel.name}</td>
                <td className="py-2 px-4 text-txt text-small text-right font-mono">{actual}</td>
                <td className="py-2 px-4 text-txt text-small text-right font-mono">{expected}</td>
                <td className="py-2 px-4 text-txt text-small text-right font-mono">{perf}</td>
                <td className="py-2 px-4 text-right">
                  <div className="flex justify-end">
                    <StatusBadge status={status} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PanelMonitoringTable;
