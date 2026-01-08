import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const dashboardService = {
  async getStats() {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/api/dashboard/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};
