import { apiClient } from './client';

export const getSiteAlerts = async (siteId, activeOnly = true) => {
  const query = activeOnly ? '?active_only=true' : '?active_only=false';
  return apiClient(`/sites/${siteId}/alerts${query}`);
};

export const getPanelAlerts = async (panelId, activeOnly = true) => {
  const query = activeOnly ? '?active_only=true' : '?active_only=false';
  return apiClient(`/panels/${panelId}/alerts${query}`);
};

export const acknowledgeAlert = async (alertId) => {
  return apiClient(`/alerts/${alertId}/acknowledge`, { method: 'PATCH' });
};

export const resolveAlert = async (alertId) => {
  return apiClient(`/alerts/${alertId}/resolve`, { method: 'PATCH' });
};

export const getAlertHistory = async (params = {}) => {
  const queryParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      queryParams.append(key, params[key]);
    }
  });
  return apiClient(`/alerts/history?${queryParams.toString()}`);
};

export const getAlertAnalytics = async (days) => {
  return apiClient(`/alerts/analytics${days ? `?days=${days}` : ''}`);
};

export const getAlertTrend = async (days = 7) => {
  return apiClient(`/alerts/analytics/trend?days=${days}`);
};
