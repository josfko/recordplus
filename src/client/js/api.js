/**
 * API Client - Fetch wrapper for backend communication
 * Task 7.3 - Requirements: All
 *
 * Environment-aware: Automatically detects localhost vs production
 * and uses the appropriate API URL.
 *
 * Features:
 * - Automatic retry with exponential backoff for transient errors
 * - Configuration caching with TTL to reduce server load
 * - Structured error handling with Spanish messages
 */

// Load configuration (may not exist in development)
let config = { API_URL: null, DEBUG: false };
try {
  const imported = await import("../config.js");
  config = imported.config || config;
} catch {
  // config.js not found - will use /api for same-origin requests
}

// ==================== Retry Logic ====================
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6

/**
 * Retryable request handler with exponential backoff
 * Automatically retries transient errors (network issues, 5xx, 429)
 */
class RetryableRequest {
  /**
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @param {number} baseDelay - Initial delay in ms (default: 1000)
   * @param {number} maxDelay - Maximum delay in ms (default: 10000)
   */
  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  /**
   * Determine if an error is retryable
   * Retryable: network errors, 5xx (except 501), 429 (rate limited)
   * NOT retryable: 4xx client errors (except 429), 501 Not Implemented
   *
   * @param {Error} error - The error to check
   * @returns {boolean} True if the request should be retried
   */
  isRetryable(error) {
    // Network errors are retryable
    if (error.code === "NETWORK_ERROR") {
      return true;
    }

    // HTTP status-based decisions
    if (error.status) {
      // 429 Too Many Requests - retryable
      if (error.status === 429) {
        return true;
      }

      // 5xx server errors are retryable (except 501 Not Implemented)
      if (error.status >= 500 && error.status !== 501) {
        return true;
      }

      // 4xx client errors are NOT retryable
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
    }

    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * Jitter prevents thundering herd when multiple clients retry simultaneously
   *
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);

    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, this.maxDelay);

    // Add random jitter (0-1000ms) to prevent thundering herd
    const jitter = Math.random() * 1000;

    return cappedDelay + jitter;
  }

  /**
   * Execute a request with automatic retry
   *
   * @param {Function} requestFn - Async function that makes the request
   * @returns {Promise<any>} The response from the request
   * @throws {Error} The last error if all retries exhausted
   */
  async execute(requestFn) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        // Don't retry if error is not retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Don't wait after the last attempt
        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          if (config.DEBUG) {
            console.log(
              `[Retry] Attempt ${attempt + 1}/${this.maxRetries} failed, retrying in ${Math.round(delay)}ms...`,
            );
          }
          await this._delay(delay);
        }
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Wait for specified milliseconds
   * @param {number} ms - Milliseconds to wait
   * @private
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ==================== Configuration Caching ====================
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6

const CONFIG_CACHE_KEY = "recordplus_config_cache";
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Configuration cache using localStorage
 * Reduces server load by caching configuration for 5 minutes
 */
class ConfigCache {
  /**
   * Get cached configuration if valid
   * @returns {Object|null} Cached configuration or null if expired/missing
   */
  static get() {
    try {
      const cached = localStorage.getItem(CONFIG_CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);

      // Check TTL
      if (Date.now() - timestamp > CONFIG_CACHE_TTL) {
        if (config.DEBUG) {
          console.log("[ConfigCache] Cache expired");
        }
        return null;
      }

      if (config.DEBUG) {
        console.log("[ConfigCache] Cache hit");
      }
      return data;
    } catch (error) {
      // localStorage unavailable or corrupted data
      if (config.DEBUG) {
        console.warn("[ConfigCache] Failed to read cache:", error.message);
      }
      return null;
    }
  }

  /**
   * Store configuration in cache
   * @param {Object} data - Configuration data to cache
   */
  static set(data) {
    try {
      localStorage.setItem(
        CONFIG_CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
      if (config.DEBUG) {
        console.log("[ConfigCache] Cache updated");
      }
    } catch (error) {
      // localStorage unavailable or quota exceeded
      if (config.DEBUG) {
        console.warn("[ConfigCache] Failed to write cache:", error.message);
      }
    }
  }

  /**
   * Invalidate the cache (call after updates)
   */
  static invalidate() {
    try {
      localStorage.removeItem(CONFIG_CACHE_KEY);
      if (config.DEBUG) {
        console.log("[ConfigCache] Cache invalidated");
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Get remaining TTL in seconds (for debugging)
   * @returns {number} Seconds until cache expires, or 0 if expired
   */
  static getRemainingTTL() {
    try {
      const cached = localStorage.getItem(CONFIG_CACHE_KEY);
      if (!cached) return 0;

      const { timestamp } = JSON.parse(cached);
      const remaining = CONFIG_CACHE_TTL - (Date.now() - timestamp);
      return Math.max(0, Math.round(remaining / 1000));
    } catch {
      return 0;
    }
  }
}

// Export for use in other modules if needed
export { RetryableRequest, ConfigCache };

class ApiClient {
  constructor() {
    this.baseUrl = this._detectBaseUrl();
  }

  /**
   * Detect the appropriate base URL based on environment
   * @returns {string} Base URL for API requests
   * @private
   */
  _detectBaseUrl() {
    const hostname = window.location.hostname;

    // Local development: use same-origin /api
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      if (config.DEBUG) {
        console.log("[API] Development mode: using /api");
      }
      return "/api";
    }

    // Production: use configured API_URL
    if (config.API_URL) {
      // Ensure URL doesn't have trailing slash and add /api if needed
      let url = config.API_URL.replace(/\/+$/, "");
      if (!url.endsWith("/api")) {
        url = `${url}/api`;
      }
      if (config.DEBUG) {
        console.log(`[API] Production mode: using ${url}`);
      }
      return url;
    }

    // Fallback: warn and use /api (will likely fail on Cloudflare Pages)
    console.warn(
      "[API] No API_URL configured for production. " +
        "Create config.js with your Cloudflare Tunnel URL. " +
        "See config.example.js for template.",
    );
    return "/api";
  }

  /**
   * Make an API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const fetchConfig = {
      credentials: "include", // Send cookies for Zero Trust auth
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, fetchConfig);

      // Check for Zero Trust redirect (HTML instead of JSON)
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        const sessionError = new Error(
          "Sesión expirada. Por favor, recargue la página.",
        );
        sessionError.code = "SESSION_EXPIRED";
        throw sessionError;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.error?.message || `HTTP ${response.status}`,
        );
        error.code = errorData.error?.code || "HTTP_ERROR";
        error.field = errorData.error?.field;
        error.status = response.status;
        throw error;
      }

      return response.json();
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        const networkError = new Error("Error de conexión con el servidor");
        networkError.code = "NETWORK_ERROR";
        throw networkError;
      }
      throw error;
    }
  }

  // ==================== Cases API ====================

  /**
   * List cases with filters and pagination
   * @param {Object} filters - { type, state, search }
   * @param {number} page - Page number
   * @param {number} pageSize - Items per page
   */
  async listCases(filters = {}, page = 1, pageSize = 20) {
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.state) params.set("state", filters.state);
    if (filters.search) params.set("search", filters.search);
    if (filters.language) params.set("language", filters.language);
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());

    return this.request(`/cases?${params}`);
  }

  /**
   * Get case by ID
   * @param {number} id - Case ID
   */
  async getCase(id) {
    return this.request(`/cases/${id}`);
  }

  /**
   * Create a new case
   * @param {Object} data - Case data
   */
  async createCase(data) {
    return this.request("/cases", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a case with optional optimistic locking
   * If version is provided, the update will only succeed if the server's
   * version matches. This prevents lost updates from concurrent edits.
   * Requirements: 3.6
   *
   * @param {number} id - Case ID
   * @param {Object} data - Updated data
   * @param {number|null} version - Optional version for optimistic locking
   */
  async updateCase(id, data, version = null) {
    const payload = { ...data };

    // Include version for optimistic locking if provided
    if (version !== null) {
      payload.expectedVersion = version;
    }

    return this.request(`/cases/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Archive a case
   * @param {number} id - Case ID
   * @param {string} closureDate - Closure date (YYYY-MM-DD)
   */
  async archiveCase(id, closureDate) {
    return this.request(`/cases/${id}/archive`, {
      method: "POST",
      body: JSON.stringify({ closureDate }),
    });
  }

  /**
   * Transition case to judicial state
   * @param {number} id - Case ID
   * @param {string} judicialDate - Judicial date (YYYY-MM-DD)
   * @param {string} district - Judicial district
   */
  async transitionToJudicial(id, judicialDate, district) {
    return this.request(`/cases/${id}/judicial`, {
      method: "POST",
      body: JSON.stringify({ judicialDate, district }),
    });
  }

  // ==================== Dashboard API ====================

  /**
   * Get dashboard metrics with retry for transient errors
   * Requirements: 5.1
   *
   * @param {number} month - Month (1-12), optional
   * @param {number} year - Year, optional
   */
  async getDashboard(month = null, year = null) {
    const params = new URLSearchParams();
    if (month) params.set("month", month.toString());
    if (year) params.set("year", year.toString());

    const query = params.toString();
    const endpoint = `/dashboard${query ? "?" + query : ""}`;

    // Use retry for this critical read operation
    const retryable = new RetryableRequest();
    return retryable.execute(() => this.request(endpoint));
  }

  // ==================== Configuration API ====================

  /**
   * Get all configuration with caching and retry
   * Returns cached data if available and valid, otherwise fetches from server
   * Requirements: 5.1, 6.1, 6.2, 6.4
   */
  async getConfig() {
    // Check cache first
    const cached = ConfigCache.get();
    if (cached) {
      return cached;
    }

    // Fetch from server with retry
    const retryable = new RetryableRequest();
    const data = await retryable.execute(() => this.request("/config"));

    // Update cache
    ConfigCache.set(data);

    return data;
  }

  /**
   * Update configuration and invalidate cache
   * Requirements: 6.3
   *
   * @param {Object} data - Configuration key-value pairs
   */
  async updateConfig(data) {
    const result = await this.request("/config", {
      method: "PUT",
      body: JSON.stringify(data),
    });

    // Invalidate cache after successful update
    ConfigCache.invalidate();

    return result;
  }

  /**
   * Force refresh configuration (bypasses cache)
   * Useful when you need the latest data
   */
  async refreshConfig() {
    ConfigCache.invalidate();
    return this.getConfig();
  }

  /**
   * Test a digital certificate (P12/PKCS12)
   * @param {string} path - Path to certificate file on server
   * @param {string} password - Certificate password
   * @returns {Promise<Object>} Certificate info or error
   */
  async testCertificate(path, password) {
    return this.request("/config/test-certificate", {
      method: "POST",
      body: JSON.stringify({ path, password }),
    });
  }

  // ==================== Export/Import API ====================

  /**
   * Export all data
   */
  async exportData() {
    return this.request("/export", { method: "POST" });
  }

  /**
   * Import data
   * @param {Object} data - Data to import
   * @param {boolean} clearExisting - Whether to clear existing data
   */
  async importData(data, clearExisting = false) {
    return this.request("/import", {
      method: "POST",
      body: JSON.stringify({ ...data, clearExisting }),
    });
  }

  // ==================== Admin API ====================

  /**
   * List database tables
   */
  async listTables() {
    return this.request("/admin/tables");
  }

  /**
   * Get table contents
   * @param {string} tableName - Table name
   * @param {number} limit - Limit
   * @param {number} offset - Offset
   */
  async getTableContents(tableName, limit = 50, offset = 0) {
    return this.request(
      `/admin/table/${tableName}?limit=${limit}&offset=${offset}`,
    );
  }

  /**
   * Execute SQL query
   * @param {string} sql - SQL query (SELECT only)
   */
  async executeQuery(sql) {
    return this.request("/admin/query", {
      method: "POST",
      body: JSON.stringify({ sql }),
    });
  }

  // ==================== Backup API ====================

  /**
   * Get backup system status
   */
  async getBackupStatus() {
    return this.request("/backup/status");
  }

  /**
   * List all available backups
   */
  async listBackups() {
    return this.request("/backup/list");
  }

  /**
   * Create a new on-demand backup
   */
  async createBackup() {
    return this.request("/backup/create", { method: "POST" });
  }

  /**
   * Get download URL for a backup file
   * @param {string} filename - Backup filename
   */
  getBackupDownloadUrl(filename) {
    return `${this.baseUrl}/backup/${filename}/download`;
  }

  /**
   * Delete a backup file
   * @param {string} filename - Backup filename
   */
  async deleteBackup(filename) {
    return this.request(`/backup/${filename}`, { method: "DELETE" });
  }

  // ==================== Health Check ====================

  /**
   * Check API health
   */
  async healthCheck() {
    return this.request("/health");
  }

  // ==================== ARAG Workflow API ====================

  /**
   * Generate, sign, and send minuta for ARAG case
   * @param {number} caseId - Case ID
   */
  async generateMinuta(caseId) {
    return this.request(`/cases/${caseId}/minuta`, {
      method: "POST",
    });
  }

  /**
   * Generate suplido for judicial ARAG case
   * @param {number} caseId - Case ID
   * @param {string} district - Judicial district
   */
  async generateSuplido(caseId, district) {
    return this.request(`/cases/${caseId}/suplido`, {
      method: "POST",
      body: JSON.stringify({ district }),
    });
  }

  /**
   * Get document and email history for a case
   * @param {number} caseId - Case ID
   */
  async getCaseHistory(caseId) {
    return this.request(`/cases/${caseId}/history`);
  }

  /**
   * Get download URL for a document
   * @param {number} documentId - Document ID
   * @returns {string} Download URL
   */
  getDocumentDownloadUrl(documentId) {
    return `${this.baseUrl}/documents/${documentId}/download`;
  }

  /**
   * Download a document by opening it in a new tab
   * @param {number} documentId - Document ID
   */
  downloadDocument(documentId) {
    const url = this.getDocumentDownloadUrl(documentId);
    window.open(url, "_blank");
  }

  /**
   * Retry a failed email
   * @param {number} caseId - Case ID
   * @param {number} emailId - Email ID
   * @returns {Promise<Object>} Retry result
   */
  async retryEmail(caseId, emailId) {
    return this.request(`/arag/cases/${caseId}/emails/${emailId}/retry`, {
      method: "POST",
    });
  }

  /**
   * Test SMTP configuration
   * @param {Object} smtpConfig - Optional SMTP config to test (for testing before save)
   */
  async testEmail(smtpConfig = null) {
    return this.request("/email/test", {
      method: "POST",
      body: JSON.stringify(smtpConfig || {}),
    });
  }

  /**
   * Get mileage rates for all districts
   */
  async getMileageRates() {
    return this.request("/mileage-rates");
  }

  // ==================== Particulares Workflow API ====================

  /**
   * Generate Hoja de Encargo for a PARTICULAR case
   * @param {number} caseId - Case ID
   * @param {string} services - Services description
   * @param {number} fees - Professional fees
   */
  async generateHojaEncargo(caseId, services, fees) {
    return this.request(`/cases/${caseId}/hoja-encargo`, {
      method: "POST",
      body: JSON.stringify({ services, fees }),
    });
  }

  /**
   * Sign an existing Hoja de Encargo document
   * @param {number} caseId - Case ID
   * @param {number} documentId - Document ID
   */
  async signHojaEncargo(caseId, documentId) {
    return this.request(`/cases/${caseId}/hoja-encargo/sign`, {
      method: "POST",
      body: JSON.stringify({ documentId }),
    });
  }

  /**
   * Send Hoja de Encargo via email
   * @param {number} caseId - Case ID
   * @param {number} documentId - Document ID
   * @param {string} email - Recipient email address
   */
  async sendHojaEncargo(caseId, documentId, email) {
    return this.request(`/cases/${caseId}/hoja-encargo/send`, {
      method: "POST",
      body: JSON.stringify({ documentId, email }),
    });
  }

  /**
   * Get all Hoja de Encargo documents for a case
   * @param {number} caseId - Case ID
   */
  async getHojaEncargoDocuments(caseId) {
    return this.request(`/cases/${caseId}/hoja-encargo/documents`);
  }

  // ==================== Turno de Oficio API ====================

  /**
   * Finalize a Turno de Oficio case (ABIERTO → FINALIZADO)
   * @param {number} caseId - Case ID
   */
  async finalizeTurnoCase(caseId) {
    return this.request(`/turno/${caseId}/finalize`, {
      method: "POST",
    });
  }

  /**
   * Reopen a finalized Turno de Oficio case (FINALIZADO → ABIERTO)
   * @param {number} caseId - Case ID
   */
  async reopenTurnoCase(caseId) {
    return this.request(`/turno/${caseId}/reopen`, {
      method: "POST",
    });
  }

  /**
   * Delete a document from a Turno de Oficio case
   * @param {number} caseId - Case ID
   * @param {number} documentId - Document ID
   */
  async deleteTurnoDocument(caseId, documentId) {
    return this.request(`/turno/${caseId}/documents/${documentId}`, {
      method: "DELETE",
    });
  }

  /**
   * Upload a document to a Turno de Oficio case
   * @param {number} caseId - Case ID
   * @param {FormData} formData - Form data with 'document' file and 'description'
   */
  async uploadTurnoDocument(caseId, formData) {
    const url = `${this.baseUrl}/turno/${caseId}/upload`;

    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include", // Send cookies for Zero Trust auth
        body: formData,
        // Note: Don't set Content-Type header, let browser set it with boundary for multipart
      });

      // Check for Zero Trust redirect (HTML instead of JSON)
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        const sessionError = new Error(
          "Sesión expirada. Por favor, recargue la página.",
        );
        sessionError.code = "SESSION_EXPIRED";
        throw sessionError;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.error?.message || `HTTP ${response.status}`,
        );
        error.code = errorData.error?.code || "HTTP_ERROR";
        error.status = response.status;
        throw error;
      }

      return response.json();
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        const networkError = new Error("Error de conexión con el servidor");
        networkError.code = "NETWORK_ERROR";
        throw networkError;
      }
      throw error;
    }
  }
}

// Export singleton instance
export const api = new ApiClient();
export default api;
