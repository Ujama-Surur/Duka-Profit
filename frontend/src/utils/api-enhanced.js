import axios from 'axios';
import localforage from 'localforage';
import toast from 'react-hot-toast';

// Configure localforage
const offlineStore = localforage.createInstance({ name: 'duka-offline' });
const pendingStore = localforage.createInstance({ name: 'duka-pending' });

// In Vite dev, `/api` is proxied by `vite.config.js`.
// In Electron production (`file://.../dist/index.html`), that proxy does not exist,
// so `/api` would point to a non-existent local path and fail.
const apiBaseURL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  : '/api';

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('duka_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle errors and retries
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry logic for network errors
    if (
      !originalRequest._retry &&
      error.code === 'NETWORK_ERROR' &&
      originalRequest._retryCount < 3
    ) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      // Exponential backoff
      const delay = Math.pow(2, originalRequest._retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retrying request (attempt ${originalRequest._retryCount})...`);
      return api(originalRequest);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('duka_token');
      localStorage.removeItem('duka_user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Batch API requests
class ApiBatcher {
  constructor() {
    this.queue = [];
    this.timeout = null;
    this.batchDelay = 50; // 50ms batch delay
  }

  addRequest(request) {
    this.queue.push(request);
    this.scheduleBatch();
  }

  scheduleBatch() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.processBatch();
    }, this.batchDelay);
  }

  async processBatch() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0);
    const requests = batch.map(item => item.request);

    try {
      // Execute all requests in parallel
      const responses = await Promise.allSettled(requests);
      
      // Resolve individual promises
      batch.forEach((item, index) => {
        const response = responses[index];
        if (response.status === 'fulfilled') {
          item.resolve(response.value);
        } else {
          item.reject(response.reason);
        }
      });
    } catch (error) {
      // Reject all if batch fails
      batch.forEach(item => item.reject(error));
    }
  }
}

const batcher = new ApiBatcher();

// Enhanced API methods with batching
const apiEnhanced = {
  // Batch multiple requests
  batch: (requests) => {
    return Promise.all(
      requests.map(request => 
        new Promise((resolve, reject) => {
          batcher.addRequest({ request, resolve, reject });
        })
      )
    );
  },

  // Get with caching
  get: async (url, options = {}) => {
    const { useCache = true, cacheKey = url } = options;
    
    if (useCache) {
      try {
        const cached = await offlineStore.getItem(cacheKey);
        if (cached && !this.isCacheExpired(cached)) {
          return { data: cached.data };
        }
      } catch (e) {
        console.log('Cache read failed:', e);
      }
    }

    try {
      const response = await api.get(url);
      
      if (useCache) {
        await offlineStore.setItem(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }
      
      return response;
    } catch (error) {
      // Try offline cache if network fails
      if (useCache) {
        try {
          const cached = await offlineStore.getItem(cacheKey);
          if (cached) {
            toast('Using offline data', { icon: '💾' });
            return { data: cached.data };
          }
        } catch (e) {
          console.log('Offline cache read failed:', e);
        }
      }
      throw error;
    }
  },

  // Post with retry
  post: async (url, data, options = {}) => {
    const { retry = true, maxRetries = 3 } = options;
    
    try {
      return await api.post(url, data);
    } catch (error) {
      if (retry && this.shouldRetry(error)) {
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          
          console.log(`Retrying POST request (attempt ${retryCount})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          try {
            return await api.post(url, data);
          } catch (retryError) {
            if (retryCount === maxRetries || !this.shouldRetry(retryError)) {
              throw retryError;
            }
            error = retryError;
          }
        }
      }
      
      throw error;
    }
  },

  // Put with retry
  put: async (url, data, options = {}) => {
    const { retry = true, maxRetries = 3 } = options;
    
    try {
      return await api.put(url, data);
    } catch (error) {
      if (retry && this.shouldRetry(error)) {
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000;
          
          console.log(`Retrying PUT request (attempt ${retryCount})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          try {
            return await api.put(url, data);
          } catch (retryError) {
            if (retryCount === maxRetries || !this.shouldRetry(retryError)) {
              throw retryError;
            }
            error = retryError;
          }
        }
      }
      
      throw error;
    }
  },

  // Delete with retry
  delete: async (url, options = {}) => {
    const { retry = true, maxRetries = 3 } = options;
    
    try {
      return await api.delete(url);
    } catch (error) {
      if (retry && this.shouldRetry(error)) {
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000;
          
          console.log(`Retrying DELETE request (attempt ${retryCount})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          try {
            return await api.delete(url);
          } catch (retryError) {
            if (retryCount === maxRetries || !this.shouldRetry(retryError)) {
              throw retryError;
            }
            error = retryError;
          }
        }
      }
      
      throw error;
    }
  },

  // Helper methods
  isCacheExpired: (cached) => {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - cached.timestamp > maxAge;
  },

  shouldRetry: (error) => {
    return (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout')
    );
  }
};

// Offline data management
export const offlineData = {
  async get(key) {
    try { return await offlineStore.getItem(key); }
    catch { return null; }
  },
  async set(key, value) {
    try { await offlineStore.setItem(key, value); }
    catch (e) { console.error('Offline store error:', e); }
  },
  async remove(key) {
    try { await offlineStore.removeItem(key); }
    catch {}
  },
  async queueOperation(operation) {
    try {
      const pending = await pendingStore.getItem('queue') || [];
      pending.push({ ...operation, id: Date.now(), timestamp: new Date().toISOString() });
      await pendingStore.setItem('queue', pending);
    } catch (e) { console.error('Queue error:', e); }
  },
  async getPendingQueue() {
    try { return await pendingStore.getItem('queue') || []; }
    catch { return []; }
  },
  async clearQueue() {
    try { await pendingStore.removeItem('queue'); }
    catch {}
  },
  async clearAll() {
    try {
      await offlineStore.clear();
      await pendingStore.clear();
      console.log('Offline cache cleared successfully.');
    } catch (e) { console.error('Error clearing offline cache:', e); }
  }
};

// Sync pending operations when online
export const syncPendingOperations = async () => {
  const queue = await offlineData.getPendingQueue();
  if (!queue.length) return;

  let synced = 0;
  const remaining = [];

  for (const op of queue) {
    try {
      await api[op.method](op.url, op.data);
      synced++;
    } catch {
      remaining.push(op);
    }
  }

  if (synced > 0) {
    toast.success(`Synced ${synced} offline operation(s)`);
    if (remaining.length === 0) {
      await offlineData.clearQueue();
    } else {
      await pendingStore.setItem('queue', remaining);
    }
  }
};

// Format currency
export const formatCurrency = (amount, currency = 'RWF') => {
  if (amount === undefined || amount === null) return `0 ${currency}`;
  return `${Number(amount).toLocaleString('en-RW')} ${currency}`;
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-RW', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-RW', {
    hour: '2-digit', minute: '2-digit'
  });
};

export default apiEnhanced;
