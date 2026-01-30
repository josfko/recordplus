/**
 * API Client - Fetch wrapper for backend communication
 * Task 7.3 - Requirements: All
 */

class ApiClient {
  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

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
   * Update a case
   * @param {number} id - Case ID
   * @param {Object} data - Updated data
   */
  async updateCase(id, data) {
    return this.request(`/cases/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
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
   * Get dashboard metrics
   * @param {number} month - Month (1-12), optional
   * @param {number} year - Year, optional
   */
  async getDashboard(month = null, year = null) {
    const params = new URLSearchParams();
    if (month) params.set("month", month.toString());
    if (year) params.set("year", year.toString());

    const query = params.toString();
    return this.request(`/dashboard${query ? "?" + query : ""}`);
  }

  // ==================== Configuration API ====================

  /**
   * Get all configuration
   */
  async getConfig() {
    return this.request("/config");
  }

  /**
   * Update configuration
   * @param {Object} data - Configuration key-value pairs
   */
  async updateConfig(data) {
    return this.request("/config", {
      method: "PUT",
      body: JSON.stringify(data),
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
   * Download a document
   * @param {number} documentId - Document ID
   */
  getDocumentDownloadUrl(documentId) {
    return `${this.baseUrl}/documents/${documentId}/download`;
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
        body: formData,
        // Note: Don't set Content-Type header, let browser set it with boundary for multipart
      });

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
