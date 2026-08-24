import { apiClient } from './client';

export const getAllPanels = async () => {
  return apiClient('/panels');
};

export const getSitePanels = async (siteId) => {
  return apiClient(`/sites/${siteId}/panels`);
};

export const getPanel = async (panelId) => {
  return apiClient(`/panels/${panelId}`);
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
