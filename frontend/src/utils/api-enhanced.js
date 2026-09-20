// Consolidated API client - redirects to the canonical ./api.js
import api, {
  formatCurrency,
  formatDate,
  formatTime,
  offlineData,
  syncPendingOperations,
} from './api';

export default api;
export {
  formatCurrency,
  formatDate,
  formatTime,
  offlineData,
  syncPendingOperations,
};
