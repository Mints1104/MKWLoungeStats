/**
 * Simple logger utility that respects environment settings
 * In production, only logs errors. In development, logs everything.
 */

const isDevelopment = process.env.NODE_ENV !== "production";

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
    if (isDevelopment && process.env.DEBUG) {
      console.log("[DEBUG]", new Date().toISOString(), ...args);
    }
  },

  /**
   * Log HTTP requests (development only)
   */
  request: (req) => {
    if (isDevelopment) {
      console.log(
        `[REQUEST] ${new Date().toISOString()} ${req.method} ${req.path}`,
        req.query && Object.keys(req.query).length > 0 ? req.query : ""
      );
    }
  },

  /**
   * Log cache operations (development only)
   */
  cache: (operation, key) => {
    if (isDevelopment && process.env.DEBUG) {
      console.log(`[CACHE] ${new Date().toISOString()} ${operation}: ${key}`);
    }
  },
};

module.exports = logger;
