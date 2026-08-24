import { apiClient } from './client';

export const getPanelCommands = async (panelId) => {
  return apiClient(`/panels/${panelId}/control`);
};

export const sendPanelCommand = async (panelId, command, reason) => {
  return apiClient(`/panels/${panelId}/control`, {
    method: 'POST',
    body: JSON.stringify({ command, reason }),
  });
};
