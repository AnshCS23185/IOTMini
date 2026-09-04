import { apiClient } from './client';

export const getAllPanels = async (siteId = null) => {
  const params = siteId ? `?site_id=${siteId}` : '';
  return apiClient(`/panels${params}`);
};

export const getSitePanels = async (siteId) => {
  return apiClient(`/sites/${siteId}/panels`);
};

export const getPanel = async (panelId) => {
  return apiClient(`/panels/${panelId}`);
};

export const getPanelsSummary = async (siteId = null) => {
  const params = siteId ? `?site_id=${siteId}` : '';
  return apiClient(`/panels/summary${params}`);
};

export const getPanelPerformance = async (panelId) => {
  return apiClient(`/panels/${panelId}/performance`);
};

export const getPanelDiagnostics = async (panelId) => {
  return apiClient(`/panels/${panelId}/diagnostics`);
};

export const getPanelAlerts = async (panelId) => {
  return apiClient(`/panels/${panelId}/alerts`);
};

export const getPanelDevice = async (panelId) => {
  return apiClient(`/panels/${panelId}/device`);
};

export const createPanel = async (siteId, data) => {
  return apiClient(`/sites/${siteId}/panels`, { method: 'POST', body: JSON.stringify(data) });
};

export const updatePanel = async (panelId, data) => {
  return apiClient(`/panels/${panelId}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const updatePanelStatus = async (panelId, status) => {
  return apiClient(`/panels/${panelId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
};

export const deletePanel = async (panelId) => {
  return apiClient(`/panels/${panelId}`, { method: 'DELETE' });
};
