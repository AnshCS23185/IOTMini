import { apiClient } from './client';

export const getSites = async () => {
  return apiClient('/sites');
};

export const getDashboard = async (siteId) => {
  return apiClient(`/sites/${siteId}/dashboard`);
};

export const getAlerts = async (siteId) => {
  return apiClient(`/sites/${siteId}/alerts`);
};
