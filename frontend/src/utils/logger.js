/**
 * Simple logger utility that respects environment settings
 * In production, only logs errors. In development, logs everything.
 */

const isDevelopment = import.meta.env.MODE !== "production";

const logger = {
  /**
   * Log informational messages (development only)
   */
  info: (...args) => {
    if (isDevelopment) {
      console.log("[INFO]", new Date().toISOString(), ...args);
    }
  },

  /**
   * Log warning messages (development only)
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn("[WARN]", new Date().toISOString(), ...args);
    }
  },

  /**
   * Log error messages (always logged)
   */
  error: (...args) => {
    console.error("[ERROR]", new Date().toISOString(), ...args);
  },

  /**
   * Log debug messages (development only, more verbose)
   */
  debug: (...args) => {
    if (isDevelopment && import.meta.env.VITE_DEBUG) {
      console.log("[DEBUG]", new Date().toISOString(), ...args);
    }
  },

  /**
   * Log API requests (development only)
   */
  api: (method, url) => {
    if (isDevelopment) {
      console.log(`[API] ${new Date().toISOString()} ${method} ${url}`);
    }
  },
};

export default logger;
