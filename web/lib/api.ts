import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
}

// Users
export const usersApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/users/${id}/status`, { status }),
}

// Customers
export const customersApi = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/customers/${id}/status`, { status, notes }),
  approve: (id: string, data?: any) =>
    api.post(`/customers/${id}/approve`, data),
  reject: (id: string, reason: string) =>
    api.post(`/customers/${id}/reject`, { reason }),
  getOrders: (id: string, params?: any) =>
    api.get(`/customers/${id}/orders`, { params }),
  getPayments: (id: string, params?: any) =>
    api.get(`/customers/${id}/payments`, { params }),
  getBalance: (id: string) => api.get(`/customers/${id}/balance`),
  addAddress: (id: string, data: any) =>
    api.post(`/customers/${id}/addresses`, data),
  updateAddress: (id: string, addressId: string, data: any) =>
    api.put(`/customers/${id}/addresses/${addressId}`, data),
  deleteAddress: (id: string, addressId: string) =>
    api.delete(`/customers/${id}/addresses/${addressId}`),
}

// Products
export const productsApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  search: (q: string) => api.get('/products/search', { params: { q } }),
  getByBarcode: (barcode: string) => api.get(`/products/barcode/${barcode}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/products/${id}/status`, { status }),
  getStock: (id: string) => api.get(`/products/${id}/stock`),
}

// Categories
export const categoriesApi = {
  getAll: (params?: any) => api.get('/categories', { params }),
  getTree: () => api.get('/categories/tree'),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
}

// Orders
export const ordersApi = {
  getAll: (params?: any) => api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  update: (id: string, data: any) => api.put(`/orders/${id}`, data),
  delete: (id: string) => api.delete(`/orders/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
  confirm: (id: string) => api.post(`/orders/${id}/confirm`),
  cancel: (id: string, reason?: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
  getStats: (params?: any) => api.get('/orders/stats', { params }),
}

// Deliveries
export const deliveriesApi = {
  getAll: (params?: any) => api.get('/deliveries', { params }),
  getById: (id: string) => api.get(`/deliveries/${id}`),
  assignDriver: (id: string, data: any) =>
    api.patch(`/deliveries/${id}/assign`, data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/deliveries/${id}/status`, { status }),
  complete: (id: string, data: any) =>
    api.post(`/deliveries/${id}/complete`, data),
  getStats: (params?: any) => api.get('/deliveries/stats', { params }),
  getRoutes: (params?: any) => api.get('/deliveries/routes', { params }),
  createRoute: (data: any) => api.post('/deliveries/routes', data),
}

// Payments
export const paymentsApi = {
  getAll: (params?: any) => api.get('/payments', { params }),
  getById: (id: string) => api.get(`/payments/${id}`),
  create: (data: any) => api.post('/payments', data),
  update: (id: string, data: any) => api.put(`/payments/${id}`, data),
  delete: (id: string) => api.delete(`/payments/${id}`),
  getStats: (params?: any) => api.get('/payments/stats', { params }),
}

// Warehouses
export const warehousesApi = {
  getAll: (params?: any) => api.get('/warehouses', { params }),
  getById: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: any) => api.post('/warehouses', data),
  update: (id: string, data: any) => api.put(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  getStock: (id: string, params?: any) =>
    api.get(`/warehouses/${id}/stock`, { params }),
  updateStock: (id: string, data: any) =>
    api.post(`/warehouses/${id}/stock`, data),
  transferStock: (data: any) => api.post('/warehouses/transfer', data),
  getLowStock: (params?: any) => api.get('/warehouses/low-stock', { params }),
}

// Reports
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getSales: (params?: any) => api.get('/reports/sales', { params }),
  getProductReport: (params?: any) =>
    api.get('/reports/sales/by-product', { params }),
  getCustomerReport: (params?: any) =>
    api.get('/reports/sales/by-customer', { params }),
  getDeliveryReport: (params?: any) =>
    api.get('/reports/deliveries', { params }),
  getPaymentReport: (params?: any) => api.get('/reports/payments', { params }),
  getStockReport: (params?: any) => api.get('/reports/stock', { params }),
}
