import { apiClient } from './client';

export const registerDevice = async (data) => {
  return apiClient('/iot/devices', {
    method: 'POST',
    body: data,
  });
};

export const getAdminDevices = async () => {
  return apiClient('/iot/devices/all');
};

export const assignDeviceSite = async (deviceUid, siteId) => {
  return apiClient(`/iot/devices/${deviceUid}/assign-site`, {
    method: 'POST',
    body: { site_id: parseInt(siteId) },
  });
};

export const getDeviceMappings = async (deviceUid) => {
  return apiClient(`/iot/devices/${deviceUid}/mappings`);
};

export const createDeviceMapping = async (deviceUid, mappingData) => {
  return apiClient(`/iot/devices/${deviceUid}/mappings`, {
    method: 'POST',
    body: mappingData,
  });
};
