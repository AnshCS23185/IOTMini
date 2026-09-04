import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const act = payload.find(p => p.dataKey === 'actual_power_w')?.value;
    const exp = payload.find(p => p.dataKey === 'expected_power_w')?.value;
    const status = payload[0]?.payload?.status;

    const isNight = exp === 0;
    const isNoData = act == null;

    let displayActual = act != null ? `${act.toFixed(1)} W` : '—';
    let displayExpected = exp != null ? `${exp.toFixed(1)} W` : '0 W';
    let displayPerf = '—';

    if (!isNight && !isNoData && act != null && exp > 0) {
      displayPerf = `${((act / exp) * 100).toFixed(1)}%`;
    }

    return (
      <div className="bg-surface border border-border p-2.5 shadow-dropdown rounded-md flex flex-col gap-1 text-caption">
        <span className="font-semibold text-txt mb-0.5">{new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        
        <div className="flex justify-between gap-4">
          <span className="text-primary font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span> Actual
          </span>
          <span className="font-mono text-txt">{displayActual}</span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-txt-muted font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-txt-muted inline-block"></span> Expected
          </span>
          <span className="font-mono text-txt-secondary">{displayExpected}</span>
        </div>

        <div className="flex justify-between gap-4 mt-0.5 pt-1 border-t border-border">
          <span className="text-txt-muted">Performance</span>
          <span className="font-mono font-medium text-txt">{displayPerf}</span>
        </div>
        
        {status && (
          <div className="mt-0.5">
             <span className="text-[10px] uppercase font-bold text-txt-muted">{status}</span>
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
      <div className="h-full w-full flex items-center justify-center text-txt-muted text-caption card">
        No performance history available for this timeframe
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="h-full w-full card p-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sortedData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--pr)" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="var(--pr)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--bd-s)" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="var(--bd-s)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="var(--bd)" opacity={0.6} />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            tick={{ fontSize: 10, fill: 'var(--tx-m)' }}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: 'var(--tx-m)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="expected_power_w" 
            stroke="var(--bd-s)" 
            fillOpacity={1} 
            fill="url(#colorExpected)" 
            name="Expected" 
            strokeDasharray="3 3"
            isAnimationActive={false}
          />
          <Area 
            type="monotone" 
            dataKey="actual_power_w" 
            stroke="var(--pr)" 
            strokeWidth={1.5}
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
