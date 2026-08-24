import { apiClient } from './client';

export const getSiteAlerts = async (siteId, activeOnly = true) => {
  const query = activeOnly ? '?active_only=true' : '?active_only=false';
  return apiClient(`/sites/${siteId}/alerts${query}`);
};

export const getPanelAlerts = async (panelId, activeOnly = true) => {
  const query = activeOnly ? '?active_only=true' : '?active_only=false';
  return apiClient(`/panels/${panelId}/alerts${query}`);
};
