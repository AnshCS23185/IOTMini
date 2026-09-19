import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { getAlertAnalytics, getAlertTrend } from '../../api/alerts';
import { Activity, ShieldAlert, CheckCircle, Clock, Zap, AlertTriangle, Info } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
  <div className="bg-surface border border-border rounded-xl p-4 flex flex-col justify-between hover:border-border-hover transition-colors">
    <div className="flex justify-between items-start mb-2">
      <span className="text-small font-medium text-txt-muted">{title}</span>
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`w-4 h-4 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <div>
      <div className="text-h2 font-semibold text-txt">{value}</div>
      {subtitle && <div className="text-[11px] text-txt-muted mt-1">{subtitle}</div>}
    </div>
  </div>
);

export const AnalyticsTab = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [trend, setTrend] = useState([]);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [anRes, trRes] = await Promise.all([
          getAlertAnalytics(days),
          getAlertTrend(days)
        ]);
        setAnalytics(anRes);
        setTrend(trRes.trends);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [days]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      
      {/* Time Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-h4 text-txt">Alert Overview</h3>
        <select 
          className="bg-surface-secondary border border-border text-small text-txt rounded-md px-3 py-1.5 focus:outline-none focus:border-primary"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={1}>Today</option>
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={0}>All Time</option>
        </select>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Alerts" 
          value={analytics.total_alerts} 
          icon={Activity} 
          colorClass="bg-primary text-primary" 
        />
        <StatCard 
          title="Critical" 
          value={analytics.critical_alerts} 
          icon={ShieldAlert} 
          colorClass="bg-error text-error" 
        />
        <StatCard 
          title="Warning" 
          value={analytics.warning_alerts} 
          icon={AlertTriangle} 
          colorClass="bg-warning text-warning" 
        />
        <StatCard 
          title="Resolved" 
          value={analytics.resolved_alerts} 
          icon={CheckCircle} 
          colorClass="bg-success text-success" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5">
          <h4 className="text-small font-semibold text-txt mb-4">Alert Trend</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#888' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#888' }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#333', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                <Bar dataKey="warning" name="Warning" stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                <Bar dataKey="info" name="Info" stackId="a" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recovery Insights */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
          <h4 className="text-small font-semibold text-txt">Recovery Insights</h4>
          
          <div className="p-3 bg-surface-secondary border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-[12px] font-medium text-txt-muted">Avg Resolution Time</span>
            </div>
            <div className="text-h3 font-semibold text-txt">
              {analytics.avg_resolution_time_minutes ? `${Math.round(analytics.avg_resolution_time_minutes)} min` : 'N/A'}
            </div>
          </div>
          
          <div className="p-3 bg-surface-secondary border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-success" />
              <span className="text-[12px] font-medium text-txt-muted">Fastest Recovery</span>
            </div>
            <div className="text-h3 font-semibold text-txt">
              {analytics.fastest_recovery_minutes ? `${Math.round(analytics.fastest_recovery_minutes)} min` : 'N/A'}
            </div>
          </div>
          
          <div className="p-3 bg-surface-secondary border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-error" />
              <span className="text-[12px] font-medium text-txt-muted">Longest Active</span>
            </div>
            <div className="text-h3 font-semibold text-txt">
              {analytics.longest_active_minutes ? `${Math.round(analytics.longest_active_minutes)} min` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Fault Distribution */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h4 className="text-small font-semibold text-txt mb-4">Fault Frequency</h4>
          <div className="space-y-3">
            {analytics.fault_distribution.length === 0 ? (
              <div className="text-small text-txt-muted">No faults recorded.</div>
            ) : (
              analytics.fault_distribution.map(f => (
                <div key={f.fault_type} className="flex items-center justify-between p-2 hover:bg-surface-secondary rounded-lg transition-colors">
                  <span className="text-[13px] font-medium text-txt">{f.fault_type}</span>
                  <span className="text-[12px] font-mono text-txt-muted bg-surface-elevated px-2 py-0.5 rounded border border-border">
                    {f.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel Alerts */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h4 className="text-small font-semibold text-txt mb-4">Top Problem Panels</h4>
          <div className="space-y-3">
            {analytics.panel_summaries.length === 0 ? (
              <div className="text-small text-txt-muted">No panels with alerts.</div>
            ) : (
              analytics.panel_summaries.map(p => (
                <div key={p.panel_id} className="flex items-center justify-between p-2 hover:bg-surface-secondary rounded-lg transition-colors group">
                  <div>
                    <div className="text-[13px] font-medium text-txt">Panel {p.panel_id}</div>
                    <div className="text-[11px] text-txt-muted mt-0.5">{p.active_alerts} Active • {p.resolved_alerts} Resolved</div>
                  </div>
                  <button 
                    onClick={() => navigate(`/performance?panelId=${p.panel_id}`)}
                    className="text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 border border-primary/20 rounded hover:bg-primary/10"
                  >
                    Metrics
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
};
