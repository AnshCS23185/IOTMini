import { apiClient } from './client';

export const getSites = async () => {
  return apiClient('/sites');
};

export const getSite = async (siteId) => {
  return apiClient(`/sites/${siteId}`);
};
