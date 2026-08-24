import { apiClient } from './client';

export const getSitePerformance = async (siteId) => {
  return apiClient(`/sites/${siteId}/performance`);
};

export const getPanelPerformanceHistory = async (panelId, from, to) => {
  let url = `/panels/${panelId}/performance/history`;
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  return apiClient(url);
};
