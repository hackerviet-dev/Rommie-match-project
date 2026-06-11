import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_DOTNET_API_URL ?? 'http://localhost:5000',
});
