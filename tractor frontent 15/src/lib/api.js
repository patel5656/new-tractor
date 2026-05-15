import API_BASE_URL from '../config/api';

// Base URL for the backend API
const API_URL = `${API_BASE_URL}/api`;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simple in-memory cache and request deduplication
const apiCache = new Map();
const pendingRequests = new Map();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Standard fetch wrapper that automatically injects the Authorization header
 * if a token is present in localStorage. Supports automatic retries, timeouts,
 * caching (GET only), and request deduplication.
 */
async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('tractorlink_token');
  const timeout = options.timeout ?? 10000; // 10s default timeout
  const method = (options.method || 'GET').toUpperCase();
  
  // Create a unique key for caching and deduplication
  const cacheKey = `${method}:${endpoint}:${options.body || ''}`;

  // 1. Caching (GET only)
  if (method === 'GET' && !options.skipCache) {
    const cached = apiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data;
    }
  }

  // Clear cache on write operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    apiCache.clear();
  }

  // 2. Request Deduplication
  // If an identical request is already in-flight, return its promise
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const performRequest = async () => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Default to 1 retry for critical writes (POST/PUT/DELETE) if not specified
    const isWrite = ['POST', 'PUT', 'DELETE'].includes(method);
    const retries = options.retries ?? (isWrite ? 1 : 0);
    const retryDelay = options.retryDelay ?? 1500;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal
        });
        clearTimeout(id);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Something went wrong');
        }

        // Cache the result if total success and GET
        if (method === 'GET') {
          apiCache.set(cacheKey, { data, timestamp: Date.now() });
        }

        return data;
      } catch (error) {
        clearTimeout(id);
        lastError = error;
        
        const isTimeout = error.name === 'AbortError';
        const isNetworkError = error.message?.includes('network') || error.message?.includes('fetch') || isTimeout;

        if (attempt < retries && isNetworkError) {
          console.warn(`[Retry ${attempt + 1}/${retries}] ${isTimeout ? 'Timeout' : 'Network error'} on ${endpoint}. Retrying...`);
          await wait(retryDelay);
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  };

  // Execute and manage the life-cycle of the pending request
  const requestPromise = performRequest();
  pendingRequests.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Always clear the pending request when done
    pendingRequests.delete(cacheKey);
  }
}

// Global cache clear utility (useful for logout)
export const clearApiCache = () => apiCache.clear();

// Auth API Calls
export const api = {
  auth: {
    login: async (phone, password) => {
      return await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });
    },
    register: async (userData) => {
      return await fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    getMe: async () => {
      return await fetchAPI('/auth/me', {
        method: 'GET',
      });
    },
    logout: async () => {
      return await fetchAPI('/auth/logout', { method: 'POST' });
    }
  },
  farmer: {
    getDashboard: async () => {
      return await fetchAPI('/farmer/dashboard');
    },
    getRecentActivity: async () => {
      return await fetchAPI('/farmer/recent-activity');
    },
    getUpcomingJobs: async () => {
      return await fetchAPI('/farmer/upcoming-jobs');
    },
    listServices: async () => {
      return await fetchAPI('/farmer/services');
    },
    listZones: async () => {
      return await fetchAPI('/farmer/zones');
    },
    getSystemConfig: async () => {
      return await fetchAPI('/farmer/settings/config');
    },
    getPricePreview: async (bookingData) => {
      return await fetchAPI('/farmer/price-preview', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });
    },
    createBooking: async (bookingData) => {
      return await fetchAPI('/farmer/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
        retries: 2
      });
    },
    checkout: async (bookingData) => {
      return await fetchAPI('/farmer/checkout', {
        method: 'POST',
        body: JSON.stringify(bookingData),
        retries: 2
      });
    },
    listBookings: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return await fetchAPI(`/farmer/bookings?${query}`);
    },
    getBooking: async (id) => {
      return await fetchAPI(`/farmer/bookings/${id}`);
    },
    getProfile: async () => {
      return await fetchAPI('/farmer/profile');
    },
    updateProfile: async (profileData) => {
      return await fetchAPI('/farmer/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileData)
      });
    },
    changePassword: async (passwordData) => {
      return await fetchAPI('/farmer/change-password', {
        method: 'PATCH',
        body: JSON.stringify(passwordData)
      });
    },
    updateLanguage: async (languageData) => {
      return await fetchAPI('/farmer/language', {
        method: 'PATCH',
        body: JSON.stringify(languageData)
      });
    }
  },
  admin: {
    getDashboardMetrics: async () => {
      return await fetchAPI('/admin/dashboard/metrics');
    },
    getAssignmentQueue: async () => {
      return await fetchAPI('/admin/dashboard/assignment-queue');
    },
    getDashboardRevenue: async (timeframe = 'daily') => {
      return await fetchAPI(`/admin/dashboard/revenue?timeframe=${timeframe}`);
    },
    getDashboardFleet: async () => {
      return await fetchAPI('/admin/dashboard/fleet');
    },
    getActiveJobs: async () => {
      return await fetchAPI('/admin/dashboard/active-jobs');
    },
    listBookings: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return await fetchAPI(`/admin/bookings?${query}`);
    },
    getBooking: async (id) => {
      return await fetchAPI(`/admin/bookings/${id}`);
    },
    getPendingBookings: async () => {
      return await fetchAPI('/admin/pending-assignment');
    },
    scheduleBooking: async (bookingId, scheduledDate) => {
      return await fetchAPI(`/admin/schedule/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({ scheduledDate }),
        retries: 2
      });
    },
    getAvailableOperators: async () => {
      return await fetchAPI('/admin/operators');
    },
    assignBooking: async (bookingId, operatorId) => {
      return await fetchAPI(`/admin/assign/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({ operatorId }),
        retries: 2
      });
    },
    dispatchBooking: async (bookingId, operatorId) => {
      return await fetchAPI(`/admin/dispatch/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify({ operatorId }),
        retries: 2
      });
    },
    getPayments: async (params = {}) => {
      const { skipCache, ...queryParams } = params;
      const query = new URLSearchParams(queryParams).toString();
      return await fetchAPI(`/admin/payments?${query}`, { skipCache });
    },
    settleBooking: async (bookingId, data = { method: 'cash' }) => {
      return await fetchAPI(`/admin/settle-booking/${bookingId}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    // Simulation API removed
    fixUSSDBooking: async (id, locationData) => {
      return await fetchAPI(`/admin/bookings/${id}/fix-location`, {
        method: 'PUT',
        body: JSON.stringify(locationData)
      });
    },
    recordCashPayment: async (data) => {
      return await fetchAPI('/admin/payments/record-cash', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    listFarmers: async () => {
      return await fetchAPI('/admin/farmers');
    },
    createFarmer: async (farmerData) => {
      return await fetchAPI('/admin/farmers', {
        method: 'POST',
        body: JSON.stringify(farmerData)
      });
    },
    updateFarmerStatus: async (farmerId, status) => {
      return await fetchAPI(`/admin/farmers/${farmerId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
    },
    getOperators: async () => {
      return await fetchAPI('/admin/operator-list');
    },
    listOperators: async () => {
      return await fetchAPI('/admin/operator-list');
    },
    createOperator: async (operatorData) => {
      return await fetchAPI('/admin/operators', {
        method: 'POST',
        body: JSON.stringify(operatorData)
      });
    },
    deleteOperator: async (id) => {
      return await fetchAPI(`/admin/operators/${id}`, {
        method: 'DELETE'
      });
    },
    // Tractor Management
    getTractors: async () => {
      return await fetchAPI('/admin/tractors');
    },
    createTractor: async (tractorData) => {
      return await fetchAPI('/admin/tractors', {
        method: 'POST',
        body: JSON.stringify(tractorData)
      });
    },
    updateTractor: async (id, tractorData) => {
      return await fetchAPI(`/admin/tractors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(tractorData)
      });
    },
    // Fuel Management
    getFuelLogs: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return await fetchAPI(`/admin/fuel-logs?${query}`);
    },
    getFuelLogsKPI: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return await fetchAPI(`/admin/fuel-logs/kpi?${query}`);
    },
    getFuelAnalytics: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return await fetchAPI(`/admin/fuel-analytics?${query}`);
    },
    updateFuelLogStatus: async (id, status) => {
      return await fetchAPI(`/admin/fuel-logs/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
    },
    reports: {
      getRevenue: async (rangeVal = '7d') => {
        return await fetchAPI(`/admin/reports/revenue?range=${rangeVal}`);
      },
      getServiceUsage: async (rangeVal = '7d') => {
        return await fetchAPI(`/admin/reports/service-usage?range=${rangeVal}`);
      },
      getFleet: async () => {
        return await fetchAPI('/admin/reports/fleet');
      },
      getFarmers: async (rangeVal = '7d') => {
        return await fetchAPI(`/admin/reports/farmers?range=${rangeVal}`);
      },
      getBookingsAnalytics: async (rangeVal = '7d') => {
        return await fetchAPI(`/admin/reports/bookings-analytics?range=${rangeVal}`);
      },
      getOperatorPerformance: async (rangeVal = '7d') => {
        return await fetchAPI(`/admin/reports/operator-performance?range=${rangeVal}`);
      },
      getJobStatusDistribution: async (rangeVal = '7d') => {
        return await fetchAPI(`/admin/reports/job-status?range=${rangeVal}`);
      },
      getTractorProfitability: async (rangeVal = '7d') => {
        return await fetchAPI(`/admin/reports/tractor-profitability?range=${rangeVal}`);
      },
      getExportData: async (rangeVal = '7d') => {
        return await fetchAPI(`/admin/reports/export?range=${rangeVal}`);
      }
    },
    // System Configuration
    getSystemConfig: async () => {
      return await fetchAPI('/admin/settings/config');
    },
    updateSystemConfig: async (config) => {
      return await fetchAPI('/admin/settings/config', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },
    getFuelHistory: async () => {
      return await fetchAPI('/admin/settings/fuel-history');
    },
    // Distance Zones
    listZones: async () => {
      return await fetchAPI('/admin/settings/zones');
    },
    createZone: async (zoneData) => {
      return await fetchAPI('/admin/settings/zones', {
        method: 'POST',
        body: JSON.stringify(zoneData)
      });
    },
    updateZone: async (id, zoneData) => {
      return await fetchAPI(`/admin/settings/zones/${id}`, {
        method: 'PUT',
        body: JSON.stringify(zoneData)
      });
    },
    deleteZone: async (id) => {
      return await fetchAPI(`/admin/settings/zones/${id}`, {
        method: 'DELETE'
      });
    },
    // System Settings - Services
    listServices: async () => {
      return await fetchAPI('/admin/services');
    },
    updateServiceRates: async (ratesData) => {
      return await fetchAPI('/admin/services', {
        method: 'PUT',
        body: JSON.stringify(ratesData)
      });
    },
    updateService: async (id, serviceData) => {
      return await fetchAPI(`/admin/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(serviceData)
      });
    },
    deleteService: async (id) => {
      return await fetchAPI(`/admin/services/${id}`, {
        method: 'DELETE'
      });
    },
    // USSD Locations
    listUssdLocations: async () => {
      return await fetchAPI('/admin/settings/ussd-locations');
    },
    createUssdLocation: async (data) => {
      return await fetchAPI('/admin/settings/ussd-locations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    updateUssdLocation: async (id, data) => {
      return await fetchAPI(`/admin/settings/ussd-locations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    deleteUssdLocation: async (id) => {
      return await fetchAPI(`/admin/settings/ussd-locations/${id}`, {
        method: 'DELETE'
      });
    }
  },
  operator: {
    getJobs: async () => {
      return await fetchAPI('/operator/jobs');
    },
    getStats: async () => {
      return await fetchAPI('/operator/stats');
    },
    updateStatus: async (id, status) => {
      return await fetchAPI(`/operator/job-status/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        retries: 2
      });
    },
    addFuelLog: async (fuelData) => {
      return await fetchAPI('/operator/fuel', {
        method: 'POST',
        body: fuelData instanceof FormData ? fuelData : JSON.stringify(fuelData)
      });
    },
    getFuelHistory: async () => {
      return await fetchAPI('/operator/fuel');
    },
    getFuelSummary: async () => {
      return await fetchAPI('/operator/fuel/summary');
    },
    getProfile: async () => {
      return await fetchAPI('/operator/profile');
    },
    updateProfile: async (profileData) => {
      return await fetchAPI('/operator/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileData)
      });
    },
    changePassword: async (passwordData) => {
      return await fetchAPI('/operator/change-password', {
        method: 'PATCH',
        body: JSON.stringify(passwordData)
      });
    },
    updateLanguage: async (languageData) => {
      return await fetchAPI('/operator/language', {
        method: 'PATCH',
        body: JSON.stringify(languageData)
      });
    }
  },
  payments: {
    getPending: async () => {
      return await fetchAPI('/payments/pending');
    },
    getHistory: async () => {
      return await fetchAPI('/payments/history');
    },
    payBooking: async (paymentData) => {
      return await fetchAPI('/payments/pay-booking', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        retries: 2
      });
    },
    settleAll: async () => {
      return await fetchAPI('/payments/settle-all', {
        method: 'POST'
      });
    }
  },
  requests: {
    create: async (payload) => {
      return await fetchAPI('/request/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    listAll: async () => {
      return await fetchAPI('/request/all', {
        method: 'GET',
      });
    },
    accept: async (id) => {
      return await fetchAPI(`/request/${id}/accept`, {
        method: 'PATCH',
      });
    }
  },
  notifications: {
    list: async () => {
      return await fetchAPI('/notifications');
    },
    markAsRead: async (id) => {
      return await fetchAPI(`/notifications/${id}/read`, {
        method: 'PATCH'
      });
    },
    markAllAsRead: async () => {
      return await fetchAPI('/notifications/read-all', {
        method: 'PATCH'
      });
    },
    delete: async (id) => {
      return await fetchAPI(`/notifications/${id}`, {
        method: 'DELETE'
      });
    },
    deleteAll: async () => {
      return await fetchAPI(`/notifications`, {
        method: 'DELETE'
      });
    }
  }
};
