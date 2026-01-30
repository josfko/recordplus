/**
 * SPA Router - Hash-based routing
 * Task 7.2 - Requirements: 5.1, 6.1
 */

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.container = null;

    // Bind hash change event
    window.addEventListener("hashchange", () => this.handleRoute());
    window.addEventListener("load", () => this.handleRoute());
  }

  /**
   * Initialize router with container element
   * @param {HTMLElement} container - Main content container
   */
  init(container) {
    this.container = container;
    this.updateNavLinks();
  }

  /**
   * Register a route
   * @param {string} path - Route path (e.g., '/', '/cases', '/cases/:id')
   * @param {Function} handler - Async function that returns HTML or renders content
   */
  register(path, handler) {
    this.routes.set(path, handler);
  }

  /**
   * Navigate to a route
   * @param {string} path - Route path
   */
  navigate(path) {
    window.location.hash = path;
  }

  /**
   * Handle route change
   */
  async handleRoute() {
    const hash = window.location.hash.slice(1) || "/";
    const { handler, params } = this.matchRoute(hash);

    if (handler) {
      this.currentRoute = hash;
      this.updateNavLinks();

      try {
        // Show loading state
        if (this.container) {
          this.container.innerHTML = '<div class="loading">Cargando...</div>';
        }

        // Execute route handler
        await handler(params);
      } catch (error) {
        console.error("Route error:", error);
        if (this.container) {
          this.container.innerHTML = `
            <div class="empty-state">
              <p>Error al cargar la página</p>
              <p>${error.message}</p>
            </div>
          `;
        }
      }
    } else {
      // 404 - Route not found
      if (this.container) {
        this.container.innerHTML = `
          <div class="empty-state">
            <h2>Página no encontrada</h2>
            <p>La ruta "${hash}" no existe.</p>
            <a href="#/" class="btn btn-secondary">Volver al Dashboard</a>
          </div>
        `;
      }
    }
  }

  /**
   * Match route and extract parameters
   * @param {string} path - Current path (may include query string)
   * @returns {{ handler: Function|null, params: Object }}
   */
  matchRoute(path) {
    // Strip query string for route matching
    const queryIndex = path.indexOf("?");
    const pathWithoutQuery = queryIndex === -1 ? path : path.slice(0, queryIndex);

    // Try exact match first
    if (this.routes.has(pathWithoutQuery)) {
      return { handler: this.routes.get(pathWithoutQuery), params: {} };
    }

    // Try pattern matching for dynamic routes
    for (const [pattern, handler] of this.routes) {
      const params = this.extractParams(pattern, pathWithoutQuery);
      if (params !== null) {
        return { handler, params };
      }
    }

    return { handler: null, params: {} };
  }

  /**
   * Extract parameters from path based on pattern
   * @param {string} pattern - Route pattern (e.g., '/cases/:id')
   * @param {string} path - Actual path (e.g., '/cases/123')
   * @returns {Object|null} - Parameters object or null if no match
   */
  extractParams(pattern, path) {
    const patternParts = pattern.split("/");
    const pathParts = path.split("/");

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        // Dynamic parameter
        const paramName = patternParts[i].slice(1);
        params[paramName] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        // Static part doesn't match
        return null;
      }
    }

    return params;
  }

  /**
   * Update navigation link active states
   */
  updateNavLinks() {
    const navLinks = document.querySelectorAll(".nav-link[data-route]");
    const currentPath = this.currentRoute || "/";

    navLinks.forEach((link) => {
      const route = link.dataset.route;
      const isActive =
        currentPath === route ||
        (route !== "/" && currentPath.startsWith(route));

      link.classList.toggle("active", isActive);
    });
  }

  /**
   * Get current route
   * @returns {string}
   */
  getCurrentRoute() {
    return this.currentRoute || "/";
  }

  /**
   * Get query parameters from hash
   * @returns {URLSearchParams}
   */
  getQueryParams() {
    const hash = window.location.hash.slice(1);
    const queryIndex = hash.indexOf("?");
    if (queryIndex === -1) return new URLSearchParams();
    return new URLSearchParams(hash.slice(queryIndex + 1));
  }
}

// Export singleton instance
export const router = new Router();
export default router;
