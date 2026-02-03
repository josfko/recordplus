/**
 * DOM Ready Utility
 * Handles the ES Module race condition with DOMContentLoaded.
 * @see .kiro/specs/es-module-initialization/design.md
 */

/**
 * Execute callback when DOM is ready.
 * Handles the race condition where ES modules load after DOMContentLoaded fires.
 *
 * @param {Function} callback - Function to run when DOM is ready
 *
 * @example
 * import { ready } from './utils/ready.js';
 *
 * ready(() => {
 *   console.log('DOM is ready!');
 *   initializeApp();
 * });
 *
 * @example
 * // With async function
 * ready(async () => {
 *   await loadData();
 *   renderUI();
 * });
 */
export function ready(callback) {
  if (document.readyState === "loading") {
    // DOM still loading - safe to add listener
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    // DOM is "interactive" or "complete" - run in next tick
    // setTimeout ensures we're in the next event loop iteration,
    // handling edge cases where DOM elements aren't fully accessible
    setTimeout(callback, 0);
  }
}
