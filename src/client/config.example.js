/**
 * Record+ Client Configuration
 *
 * Copy this file to config.js and update the values for your environment.
 * config.js is gitignored and should NOT be committed.
 *
 * For Cloudflare Pages deployment:
 * 1. Copy this file to config.js
 * 2. Set API_URL to your Cloudflare Tunnel endpoint
 * 3. Deploy config.js alongside other static files
 */
export const config = {
  /**
   * Backend API URL
   *
   * For local development: Leave as null (will use /api)
   * For Cloudflare Pages: Set to your tunnel URL, e.g.:
   *   "https://api-recordplus.cfargotunnel.com"
   *   or with custom domain: "https://api.recordplus.es"
   */
  API_URL: null,

  /**
   * Debug mode
   *
   * When true, logs API requests and environment detection to console.
   * Set to false in production.
   */
  DEBUG: false,
};
