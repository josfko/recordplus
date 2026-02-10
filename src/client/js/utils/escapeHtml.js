/**
 * HTML attribute escaping utility
 * Prevents DOM corruption when interpolating values into HTML template literals
 */

/**
 * Escape a value for safe embedding in an HTML attribute (inside double quotes).
 * @param {*} value - Value to escape (converted to string)
 * @returns {string} Safe string for use in value="..."
 */
export function escapeAttr(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`/g, "&#96;");
}
