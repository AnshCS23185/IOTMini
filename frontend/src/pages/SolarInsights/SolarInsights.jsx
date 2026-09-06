import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSites } from '../../api/sites';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { 
  Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, Thermometer,
  Sunrise, Sunset, AlertTriangle, Info, MapPin, Zap, Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatusBadge } from '../../components/ui/StatusBadge';

const getWeatherIcon = (code, isDay = 1) => {
  if (code === undefined || code === null) return isDay ? Sun : Moon;
  if (code === 0) return isDay ? Sun : Moon;
  if (code >= 1 && code <= 3) return Cloud;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 82) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
};

const getWeatherDescription = (code) => {
  if (code === undefined || code === null) return "Unknown";
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 71 && code <= 75) return "Snow";
  if (code >= 95) return "Thunderstorm";
  return "Variable";
};

const SolarInsights = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        // Get the client's site
        const sites = await getSites();
        if (!sites || sites.length === 0) {
          setError("No site assigned. Please contact support.");
          return;
        }
        
        const siteId = sites[0].id;
        
        // Fetch insights
        const data = await apiClient(`/sites/${siteId}/solar-insights`);
        setData(data);
      } catch (err) {
        console.error("Error fetching solar insights:", err);
        setError("Unable to load Solar Insights. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-2 bg-background">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Loading your Solar Insights...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-3 bg-background">
        <AlertTriangle className="h-6 w-6 text-error" />
        <span className="text-small text-error font-medium">{error}</span>
      </div>
    );
  }

  const { weather, solar_potential, panels, insights } = data;
  const CurrentWeatherIcon = weather ? getWeatherIcon(weather.weathercode, weather.is_day) : Cloud;
  
  const formatTime = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto page-container gap-5">
      {/* Page Header */}
      <div className="flex flex-col">
        <h1 className="text-[28px] font-bold text-txt leading-tight tracking-tight">Solar Insights</h1>
        <p className="text-[14px] text-txt-muted mt-0.5">Real-time environmental conditions and estimated solar generation for your site.</p>
        
        <div className="flex items-center gap-2 mt-3 text-small text-txt font-medium bg-surface-elevated py-1.5 px-3 rounded-md w-fit border border-border shadow-sm">
          <MapPin className="h-4 w-4 text-primary" />
          {data.site_name}
          <span className="text-txt-muted font-normal ml-1">({data.latitude}°, {data.longitude}°)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Section 1: Current Conditions */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <div className="card">
            <h3 className="text-subsection font-semibold text-txt mb-4 flex items-center gap-2">
              <Sun className="h-4 w-4 text-primary" /> Current Weather
            </h3>
            {weather ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <CurrentWeatherIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-[28px] font-bold text-txt leading-none">{weather.temperature}°C</div>
                    <div className="text-small text-txt-muted">{getWeatherDescription(weather.weathercode)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="flex flex-col">
                    <span className="text-caption text-txt-muted flex items-center gap-1"><Thermometer className="h-3 w-3"/> Feels Like</span>
                    <span className="text-small font-medium text-txt">{weather.feels_like != null ? `${weather.feels_like}°C` : '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-caption text-txt-muted flex items-center gap-1"><Droplets className="h-3 w-3"/> Humidity</span>
                    <span className="text-small font-medium text-txt">{weather.humidity != null ? `${weather.humidity}%` : '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-caption text-txt-muted flex items-center gap-1"><Wind className="h-3 w-3"/> Wind</span>
                    <span className="text-small font-medium text-txt">{weather.wind_speed != null ? `${weather.wind_speed} km/h` : '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-caption text-txt-muted flex items-center gap-1"><Cloud className="h-3 w-3"/> Cloud Cover</span>
                    <span className="text-small font-medium text-txt">{weather.cloud_cover != null ? `${weather.cloud_cover}%` : '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-small text-txt-muted text-center py-6">Weather API unavailable</div>
            )}
          </div>

          <div className="card">
            <h3 className="text-subsection font-semibold text-txt mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#D59D80]" /> Solar Conditions
            </h3>
            {weather && weather.forecast && weather.forecast.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <span className="text-caption text-txt-muted">Current Irradiance</span>
                  <span className="text-[20px] font-bold text-txt">{weather.solar_radiation} W/m²</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#D59D80]/10 flex items-center justify-center text-[#D59D80]">
                      <Sunrise className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-caption text-txt-muted">Sunrise</span>
                      <span className="text-small font-medium text-txt">{formatTime(weather.forecast[0].sunrise)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center text-txt-muted">
                      <Sunset className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-caption text-txt-muted">Sunset</span>
                      <span className="text-small font-medium text-txt">{formatTime(weather.forecast[0].sunset)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-small text-txt-muted text-center py-6">Solar data unavailable</div>
            )}
          </div>
        </div>

        {/* Section 2 & 3: Solar Generation Potential & Curve */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="card px-4 py-3">
              <div className="text-caption text-txt-muted mb-1 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5"/> Total Capacity</div>
              <div className="text-[20px] font-bold text-txt font-mono">
                {solar_potential.total_capacity_w >= 1000 ? `${(solar_potential.total_capacity_w / 1000).toFixed(1)} kW` : `${solar_potential.total_capacity_w} W`}
              </div>
            </div>
            <div className="card px-4 py-3 border-l-4 border-[#D59D80]">
              <div className="text-caption text-txt-muted mb-1">Expected Power</div>
              <div className="text-[20px] font-bold text-txt font-mono">
                {solar_potential.current_expected_power_w >= 1000 ? `${(solar_potential.current_expected_power_w / 1000).toFixed(1)} kW` : `${solar_potential.current_expected_power_w.toFixed(1)} W`}
              </div>
            </div>
            <div className="card px-4 py-3">
              <div className="text-caption text-txt-muted mb-1">Expected Energy Today</div>
              <div className="text-[20px] font-bold text-txt font-mono">
                {solar_potential.expected_energy_today_wh >= 1000 ? `${(solar_potential.expected_energy_today_wh / 1000).toFixed(1)} kWh` : `${solar_potential.expected_energy_today_wh.toFixed(1)} Wh`}
              </div>
            </div>
          </div>

          <div className="card flex-1 min-h-[300px]">
            <h3 className="text-subsection font-semibold text-txt mb-4">Today's Expected Solar Curve</h3>
            {solar_potential.today_curve && solar_potential.today_curve.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={solar_potential.today_curve} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="#6C8F8A" fontSize={12} tickMargin={10} minTickGap={30} />
                    <YAxis stroke="#6C8F8A" fontSize={12} tickFormatter={(val) => `${val}W`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E2325', borderColor: '#2A3135', borderRadius: '8px', color: '#E1E3E5' }}
                      itemStyle={{ color: '#E1E3E5' }}
                      labelStyle={{ color: '#88989D', marginBottom: '4px' }}
                    />
                    {solar_potential.has_telemetry && (
                      <Line type="monotone" dataKey="actual_power_w" name="Actual" stroke="#3B2823" strokeWidth={2} dot={false} />
                    )}
                    <Line type="monotone" dataKey="expected_power_w" name="Expected" stroke="#D59D80" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-small text-txt-muted">
                PVGIS curve unavailable
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 6: Insights / Warnings */}
      {insights.length > 0 && (
        <div className="bg-surface-secondary border border-border rounded-lg p-4 flex flex-col gap-2">
          <h3 className="text-small font-semibold text-txt flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" /> Solar Insights & Alerts
          </h3>
          <ul className="flex flex-col gap-1.5 ml-6 list-disc text-small text-txt-muted">
            {insights.map((insight, idx) => (
              <li key={idx}>{insight}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Section 4: Panel-wise Expected Output */}
        <div className="card p-0 flex flex-col min-h-[300px]">
          <div className="p-4 border-b border-border shrink-0">
            <h3 className="text-subsection font-semibold text-txt">Panel Configurations & Output</h3>
          </div>
          <div className="flex-1 overflow-auto">
            {panels.length === 0 ? (
              <div className="p-8 text-center text-txt-muted text-small">No panels configured.</div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="table-header">
                  <tr>
                    <th className="py-2 px-4">Panel</th>
                    <th className="py-2 px-4">Config</th>
                    <th className="py-2 px-4 text-right">Expected</th>
                    <th className="py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {panels.map((p) => (
                    <tr key={p.id} className="table-row text-caption hover:bg-surface-hover cursor-pointer" onClick={() => navigate(`/panels/${p.id}`)}>
                      <td className="table-cell px-4">
                        <div className="font-medium text-txt">{p.name || `P${p.id}`}</div>
                        <div className="text-txt-muted">{p.rated_power_w} W • {p.technology}</div>
                      </td>
                      <td className="table-cell px-4 text-txt-muted">
                        {p.tilt}° / {p.azimuth}°
                      </td>
                      <td className="table-cell px-4 text-right font-mono font-medium text-txt">
                        {p.expected_power_w.toFixed(1)} W
                      </td>
                      <td className="table-cell px-4">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 5: Forecast */}
        <div className="card">
          <h3 className="text-subsection font-semibold text-txt mb-4">7-Day Forecast</h3>
          {weather && weather.forecast && weather.forecast.length > 0 ? (
            <div className="flex flex-col gap-2">
              {weather.forecast.map((f, idx) => {
                const FI = getWeatherIcon(f.weathercode);
                return (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="w-24 text-small font-medium text-txt">{formatDate(f.date)}</div>
                    <div className="flex items-center gap-2 flex-1">
                      <FI className="h-4 w-4 text-txt-muted" />
                      <span className="text-caption text-txt-muted hidden sm:inline-block truncate max-w-[120px]">
                        {getWeatherDescription(f.weathercode)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-small font-mono">
                      <span className="text-txt-muted">{f.temp_min != null ? Math.round(f.temp_min) : '—'}°</span>
                      <div className="w-16 h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                        <div className="h-full bg-[#D59D80] w-full opacity-50"></div>
                      </div>
                      <span className="text-txt font-semibold">{f.temp_max != null ? Math.round(f.temp_max) : '—'}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-small text-txt-muted text-center py-6">Forecast unavailable</div>
          )}
        </div>
      </div>

      {/* Section 7: Data Status */}
      <div className="flex flex-wrap items-center gap-4 text-caption text-txt-muted bg-surface-secondary px-4 py-2.5 rounded-lg border border-border mt-2">
        <span className="font-semibold text-txt flex items-center gap-1.5"><Info className="h-3.5 w-3.5"/> Data Sources:</span>
        <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-success"></div> Live Weather API</span>
        <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-success"></div> PVGIS Solar Potential</span>
        <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-success"></div> PanelIQ Config</span>
        <span className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${solar_potential.has_telemetry ? 'bg-success' : 'border border-txt-muted'}`}></div> 
          {solar_potential.has_telemetry ? 'Live Panel Telemetry' : 'Telemetry Not Connected'}
        </span>
      </div>

    </div>
  );
};

export default SolarInsights;
