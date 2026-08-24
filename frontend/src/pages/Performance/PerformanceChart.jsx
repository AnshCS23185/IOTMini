import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

// Custom tooltip honoring NO_SOLAR and NO_DATA edge cases
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const act = payload.find(p => p.dataKey === 'actual_power_w')?.value;
    const exp = payload.find(p => p.dataKey === 'expected_power_w')?.value;
    const status = payload[0]?.payload?.status; // we inject status into the data

    const isNight = exp === 0;
    const isNoData = act == null;

    let displayActual = act != null ? `${act.toFixed(1)} W` : 'N/A';
    let displayExpected = exp != null ? `${exp.toFixed(1)} W` : '0 W';
    let displayPerf = 'N/A';

    if (!isNight && !isNoData && act != null && exp > 0) {
      displayPerf = `${((act / exp) * 100).toFixed(1)}%`;
    }

    return (
      <div className="bg-surface border border-border p-3 shadow-md rounded flex flex-col gap-1 text-small">
        <span className="font-semibold text-text mb-1">{new Date(label).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        
        <div className="flex justify-between gap-4">
          <span className="text-[#104C64] font-medium flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#104C64]"></div> Actual
          </span>
          <span className="font-mono text-text">{displayActual}</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-[#D59D80] font-medium flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#D59D80]"></div> Expected
          </span>
          <span className="font-mono text-text">{displayExpected}</span>
        </div>

        <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-border">
          <span className="text-text-muted">Performance</span>
          <span className="font-mono text-text">{displayPerf}</span>
        </div>
        
        {status && (
          <div className="mt-1">
             <span className="text-[10px] uppercase font-bold text-text-muted">{status}</span>
          </div>
        )}
      </div>
    );
  }

  return null;
};

const PerformanceChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-text-muted text-small border border-border bg-surface rounded">
        No performance history available
      </div>
    );
  }

  // Ensure data is sorted by timestamp chronologically (ascending for chart)
  const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="h-full w-full border border-border bg-surface p-2 rounded">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sortedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#104C64" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#104C64" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D59D80" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#D59D80" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            tick={{fontSize: 10}}
            tickLine={false}
            axisLine={false}
            className="text-text-muted"
          />
          <YAxis 
            tick={{fontSize: 10}}
            tickLine={false}
            axisLine={false}
            className="text-text-muted"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="expected_power_w" 
            stroke="#D59D80" 
            fillOpacity={1} 
            fill="url(#colorExpected)" 
            name="Expected" 
            strokeDasharray="4 4"
            isAnimationActive={false}
          />
          <Area 
            type="monotone" 
            dataKey="actual_power_w" 
            stroke="#104C64" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorActual)" 
            name="Actual" 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
