import { apiClient } from './client';

export const getSites = async () => {
  return apiClient('/sites');
};

export const getSite = async (siteId) => {
  return apiClient(`/sites/${siteId}`);
};

export const updateSite = async (siteId, data) => {
  return apiClient(`/sites/${siteId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteSite = async (siteId) => {
  return apiClient(`/sites/${siteId}`, {
    method: 'DELETE',
  });
};
