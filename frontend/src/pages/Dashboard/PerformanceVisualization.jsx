import React from 'react';

const PerformanceVisualization = ({ currentPower, expectedPower }) => {
  const isNighttime = expectedPower === 0;
  
  // Calculate relative widths (max 100%)
  const maxPower = Math.max(expectedPower, currentPower, 1); // Avoid div by zero
  const expectedWidth = isNighttime ? 0 : (expectedPower / maxPower) * 100;
  const currentWidth = isNighttime ? 0 : Math.min((currentPower / maxPower) * 100, 100);
  
  const perfPct = isNighttime ? 0 : (currentPower / expectedPower) * 100;

  let barColorClass = 'bg-status-healthy'; // Sage Teal
  if (isNighttime) {
    barColorClass = 'bg-status-neutral'; // Lavender
  } else if (perfPct < 90) {
    barColorClass = 'bg-status-warning'; // Deep Brown / Solar Orange depending on theme
  } else if (perfPct < 95) {
    barColorClass = 'bg-status-attention'; // Solar Orange
  }

  return (
    <div className="flex flex-col gap-3 p-4 border border-border bg-surface rounded shadow-sm h-full justify-center">
      <h3 className="text-small font-semibold text-text uppercase tracking-wider mb-2">Performance Profile</h3>
      
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-small text-text-muted mb-1">
          <span>Expected</span>
          <span>{expectedPower.toFixed(1)} W</span>
        </div>
        <div className="h-4 w-full bg-border rounded overflow-hidden">
          <div 
            className="h-full bg-primary/40 transition-all duration-500" 
            style={{ width: `${expectedWidth}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <div className="flex justify-between text-small text-text-muted mb-1">
          <span>Actual</span>
          <span>{isNighttime ? '0.0 W' : `${currentPower.toFixed(1)} W`}</span>
        </div>
        <div className="h-4 w-full bg-border rounded overflow-hidden">
          <div 
            className={`h-full ${barColorClass} transition-all duration-500`} 
            style={{ width: `${currentWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default PerformanceVisualization;
