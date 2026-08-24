import { apiClient } from './client';

export const getPanelDiagnostic = async (panelId) => {
  return apiClient(`/panels/${panelId}/diagnostics`);
};

export const getPanelDiagnosticHistory = async (panelId) => {
  return apiClient(`/panels/${panelId}/diagnostics/history`);
};

export const runPanelDiagnostic = async (panelId) => {
  return apiClient(`/panels/${panelId}/diagnostics/run`, {
    method: 'POST'
  });
};
