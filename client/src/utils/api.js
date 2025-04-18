import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create custom axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for retry logic
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is a timeout or network error, and we haven't retried too many times
    if (
      (error.code === 'ECONNABORTED' || !error.response) &&
      originalRequest.retryCount < MAX_RETRIES
    ) {
      originalRequest.retryCount = originalRequest.retryCount ? originalRequest.retryCount + 1 : 1;
      
      console.log(`Retrying request (${originalRequest.retryCount}/${MAX_RETRIES})...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * originalRequest.retryCount));
      
      return api(originalRequest);
    }

    // Format error message
    let errorMessage = 'An error occurred';
    if (error.response) {
      // Server responded with error
      errorMessage = error.response.data?.message || 
                    error.response.data?.error || 
                    `Server error: ${error.response.status}`;
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. Please try again.';
    } else if (!error.response) {
      errorMessage = 'Network error. Please check your connection.';
    }

    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;

    return Promise.reject(enhancedError);
  }
);

// API methods
export const loans = {
  getAll: () => api.get('/loans'),
  getById: (id) => api.get(`/loans/${id}`),
  create: (data) => api.post('/loans', data),
  update: (id, data) => api.put(`/loans/${id}`, data),
  delete: (id) => api.delete(`/loans/${id}`),
  addPayment: (id, data) => api.post(`/loans/${id}/payment`, data),
  addPrepayment: (id, data) => api.post(`/loans/${id}/prepayment`, data),
  addSpent: (id, data) => api.post(`/loans/${id}/spent`, data),
  updatePrepayment: (loanId, prepaymentId, data) => 
    api.put(`/loans/${loanId}/prepayment/${prepaymentId}`, data),
  deletePrepayment: (loanId, prepaymentId) => 
    api.delete(`/loans/${loanId}/prepayment/${prepaymentId}`),
};

export default api; 