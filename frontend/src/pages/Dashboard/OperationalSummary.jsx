import React from 'react';
import { StatusBadge } from '../../components/ui/StatusBadge';

const OperationalSummary = ({ data }) => {
  if (!data) return null;

  const isNighttime = data.expected_power_w === 0;

  // Determine overall site status
  let overallStatus = 'HEALTHY';
  if (data.error_panels > 0 || data.offline_panels > 0) {
    overallStatus = 'ERROR';
  } else if (data.underperforming_panels > 0) {
    overallStatus = 'UNDERPERFORMING';
  } else if (data.attention_panels > 0) {
    overallStatus = 'ATTENTION';
  }

  if (isNighttime) {
    overallStatus = 'NO_SOLAR';
  }

  const formatPower = (w) => {
    if (w == null) return 'N/A';
    if (w >= 1000) return `${(w / 1000).toFixed(2)} kW`;
    return `${w.toFixed(1)} W`;
  };

  const formatPct = (pct) => {
    if (pct == null) return 'N/A';
    return `${pct.toFixed(1)}%`;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-6 p-4 border border-border bg-surface rounded items-start sm:items-center justify-between mb-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-small text-text-muted font-medium uppercase tracking-wider">Current Power</span>
        <span className="text-large font-display font-semibold text-text">
          {isNighttime ? '0 W' : formatPower(data.current_power_w)}
        </span>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-small text-text-muted font-medium uppercase tracking-wider">Expected Power</span>
        <span className="text-large font-display font-semibold text-text">
          {formatPower(data.expected_power_w)}
        </span>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-small text-text-muted font-medium uppercase tracking-wider">Performance</span>
        <span className="text-large font-display font-semibold text-text">
          {isNighttime ? 'N/A' : formatPct(data.performance_percentage)}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-small text-text-muted font-medium uppercase tracking-wider">Site Status</span>
        <StatusBadge status={overallStatus} />
      </div>
    </div>
  );
};

export default OperationalSummary;
