import { apiClient } from './client';

export const getDeviceStatus = async (deviceUid) => {
  return apiClient(`/iot/devices/${deviceUid}/status`);
};

// Panel-specific sensor data fetching
export const getLatestReading = async (panelId) => {
  return apiClient(`/panels/${panelId}/readings/latest`);
};

export const getHistoricalReadings = async (panelId, limit = 100) => {
  return apiClient(`/panels/${panelId}/readings?limit=${limit}`);
};
