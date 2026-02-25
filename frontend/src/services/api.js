import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const signup = (data) => api.post('/auth/signup', data);
export const getMe = () => api.get('/auth/me');

// Company
export const getCompany = () => api.get('/company');
export const updateCompany = (data) => api.put('/company', data);
export const getSubscription = () => api.get('/subscription');

// Customers
export const getCustomers = () => api.get('/customers');
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// Vendors
export const getVendors = () => api.get('/vendors');
export const getVendor = (id) => api.get(`/vendors/${id}`);
export const createVendor = (data) => api.post('/vendors', data);
export const updateVendor = (id, data) => api.put(`/vendors/${id}`, data);
export const deleteVendor = (id) => api.delete(`/vendors/${id}`);

// Invoices
export const getInvoices = () => api.get('/invoices');
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const createInvoice = (data) => api.post('/invoices', data);
export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);
export const updateInvoiceStatus = (id, status) => api.patch(`/invoices/${id}/status`, null, { params: { status } });
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`);

// Payments
export const getPayments = () => api.get('/payments');
export const getPayment = (id) => api.get(`/payments/${id}`);
export const createPayment = (data) => api.post('/payments', data);
export const deletePayment = (id) => api.delete(`/payments/${id}`);

// Bills
export const getBills = () => api.get('/bills');
export const getBill = (id) => api.get(`/bills/${id}`);
export const createBill = (data) => api.post('/bills', data);
export const updateBill = (id, data) => api.put(`/bills/${id}`, data);
export const payBill = (id, amount) => api.patch(`/bills/${id}/pay`, null, { params: { amount } });
export const deleteBill = (id) => api.delete(`/bills/${id}`);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getRevenueChart = () => api.get('/dashboard/revenue-chart');

// News Feed
export const getNewsFeed = (params) => api.get('/news/feed', { params });
export const getNewsItem = (id) => api.get(`/news/${id}`);
export const createNews = (data) => api.post('/news', data);
export const updateNews = (id, data) => api.put(`/news/${id}`, data);
export const deleteNews = (id) => api.delete(`/news/${id}`);
export const getNewsCategories = () => api.get('/news/categories/list');

// ITR Filing
export const uploadForm16 = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/itr/upload-form16', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
export const calculateTax = (form16Data) => api.post('/itr/calculate-tax', form16Data);
export const getITRHistory = () => api.get('/itr/history');
export const fileITR = (itrId) => api.post(`/itr/${itrId}/file`);

// ITR PDF Generation
export const generateITRPdf = async (itrId) => {
  const response = await api.get(`/itr/${itrId}/generate-pdf`, {
    responseType: 'blob',
  });
  return response;
};

// ITR Document Processing (Multi-Provider AI)
export const processITRDocuments = (files) => {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append('files', file);
  });
  return api.post('/itr/process-documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// ITR Calculate with Reconciliation
export const calculateTaxWithReconciliation = (data) => api.post('/itr/calculate-with-reconciliation', data);

export default api;
