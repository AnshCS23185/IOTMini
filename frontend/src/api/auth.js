import { apiClient } from './client';

export const login = async (email, password) => {
  return apiClient('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
};

export const getCurrentUser = async () => {
  return apiClient('/auth/me', {
    method: 'GET',
  });
};

export const logout = async () => {
  return apiClient('/auth/logout', {
    method: 'POST',
  });
};

export const changePassword = async (newPassword) => {
  return apiClient('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  });
};
