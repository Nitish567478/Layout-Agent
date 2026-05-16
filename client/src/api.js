import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL: apiBase || 'https://layout-agent-i0mg.onrender.com',
});


