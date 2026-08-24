import { apiClient } from './client';

export const login = async (email, password) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);

  return apiClient('/auth/login', {
    method: 'POST',
    body: formData,
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
