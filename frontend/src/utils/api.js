import axios from "axios";
import localforage from "localforage";
import toast from "react-hot-toast";

// Simple UUID v4 generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Configure localforage
const offlineStore = localforage.createInstance({ name: "duka-offline" });
const pendingStore = localforage.createInstance({ name: "duka-pending" });

// In Vite dev, `/api` is proxied by `vite.config.js`.
// In Electron production (`file://.../dist/index.html`), that proxy does not exist,
// so `/api` would point to a non-existent local path and fail.
const apiBaseURL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL || "http://localhost:5000"
  : "/api";

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("duka_token");
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
      (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") &&
      (originalRequest._retryCount || 0) < 3
    ) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      // Exponential backoff
      const delay = Math.pow(2, originalRequest._retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(originalRequest);
    }

    // Handle 401 unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem("duka_token");
      localStorage.removeItem("duka_user");
      const pathname = window.location.pathname;
      if (pathname !== "/login" && pathname !== "/register") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// Format currency
export const formatCurrency = (amount, currency = "RWF") => {
  if (amount === undefined || amount === null) return `0 ${currency}`;
  return `${Number(amount).toLocaleString("en-RW")} ${currency}`;
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-RW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString("en-RW", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Offline data management
export const offlineData = {
  async get(key) {
    try {
      return await offlineStore.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      await offlineStore.setItem(key, value);
    } catch (e) {
      console.error("Offline store error:", e);
    }
  },
  async remove(key) {
    try {
      await offlineStore.removeItem(key);
    } catch {}
  },
  async queueOperation(operation) {
    try {
      const pending = (await pendingStore.getItem("queue")) || [];
      pending.push({
        ...operation,
        id: generateUUID(),
        timestamp: new Date().toISOString(),
      });
      await pendingStore.setItem("queue", pending);
    } catch (e) {
      console.error("Queue error:", e);
    }
  },
  async getPendingQueue() {
    try {
      return (await pendingStore.getItem("queue")) || [];
    } catch {
      return [];
    }
  },
  async clearQueue() {
    try {
      await pendingStore.removeItem("queue");
    } catch {}
  },
};

// Sync pending operations when online
export const syncPendingOperations = async () => {
  const queue = await offlineData.getPendingQueue();
  if (!queue.length) return;

  // Group operations by type
  const salesOps = queue.filter(op => op.url === '/sales' && op.method === 'post');
  const otherOps = queue.filter(op => !(op.url === '/sales' && op.method === 'post'));

  let synced = 0;
  const remaining = [];

  // Batch sync sales operations
  if (salesOps.length > 0) {
    try {
      const salesData = salesOps.map(op => op.data);
      const response = await api.post('/sales/batch-sync', { sales: salesData });
      
      if (response.data.success > 0) {
        synced += response.data.success;
        toast.success(`Synced ${response.data.success} offline sale(s)`);
      }
      
      if (response.data.errors.length > 0) {
        toast.error(`${response.data.errors.length} sale(s) failed to sync`);
        // Keep failed operations in queue
        const failedIds = response.data.errors.map(e => e.sale);
        salesOps.forEach(op => {
          if (failedIds.some(failed => JSON.stringify(failed) === JSON.stringify(op.data))) {
            remaining.push(op);
          }
        });
      }
    } catch (err) {
      console.error('Batch sync error:', err);
      // If batch sync fails, fall back to individual sync
      for (const op of salesOps) {
        try {
          await api[op.method](op.url, op.data);
          synced++;
        } catch {
          remaining.push(op);
        }
      }
    }
  }

  // Sync other operations individually
  for (const op of otherOps) {
    try {
      await api[op.method](op.url, op.data);
      synced++;
    } catch {
      remaining.push(op);
    }
  }

  if (synced > 0) {
    if (remaining.length === 0) {
      await offlineData.clearQueue();
    } else {
      await pendingStore.setItem("queue", remaining);
    }
  }
};
