import { apiClient } from './client';

// Users
export const getUsers = async () => {
  return apiClient('/users');
};
export const createUser = async (data) => {
  return apiClient('/users', { method: 'POST', body: JSON.stringify(data) });
};
export const updateUser = async (userId, data) => {
  return apiClient(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteUser = async (userId) => {
  return apiClient(`/users/${userId}`, { method: 'DELETE' });
};

// Organizations
export const getOrganizations = async () => {
  return apiClient('/organizations');
};
export const createOrganization = async (data) => {
  return apiClient('/organizations', { method: 'POST', body: data }); // Let apiClient stringify if not FormData
};

// Sites
export const createSite = async (data) => {
  return apiClient('/sites', { method: 'POST', body: JSON.stringify(data) });
};
export const updateSite = async (siteId, data) => {
  return apiClient(`/sites/${siteId}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteSite = async (siteId) => {
  return apiClient(`/sites/${siteId}`, { method: 'DELETE' });
};

// Panels
export const createPanel = async (siteId, data) => {
  return apiClient(`/sites/${siteId}/panels`, { method: 'POST', body: JSON.stringify(data) });
};
export const updatePanel = async (panelId, data) => {
  return apiClient(`/panels/${panelId}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deletePanel = async (panelId) => {
  return apiClient(`/panels/${panelId}`, { method: 'DELETE' });
};
