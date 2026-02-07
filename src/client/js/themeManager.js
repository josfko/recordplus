/**
 * Theme Manager
 * Handles dark/light theme toggle with localStorage persistence
 * and OS preference detection.
 */

const STORAGE_KEY = "recordplus-theme";

class ThemeManager {
  constructor() {
    this.userChose = false;
  }

  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      this.userChose = true;
      this.apply(saved);
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      this.apply(prefersDark ? "dark" : "light");
    }

    // Follow OS changes only if user hasn't explicitly chosen
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!this.userChose) {
          this.apply(e.matches ? "dark" : "light");
        }
      });
  }

  get current() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    this.updateToggleIcon(theme);
  }

  toggle() {
    this.userChose = true;
    const next = this.current === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    this.apply(next);
  }

  updateToggleIcon(theme) {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const sunIcon = btn.querySelector(".icon-sun");
    const moonIcon = btn.querySelector(".icon-moon");
    if (sunIcon && moonIcon) {
      sunIcon.style.display = theme === "dark" ? "block" : "none";
      moonIcon.style.display = theme === "light" ? "block" : "none";
    }
  }
}

export const themeManager = new ThemeManager();
