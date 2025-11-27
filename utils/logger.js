// utils/logger.js
// Environment-based logging utility

const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

/**
 * Logger utility that respects environment settings
 * Removes sensitive data in production
 */
class Logger {
  log(...args) {
    if (isDevelopment) {
      console.log(...this.sanitizeArgs(args));
    }
  }

  error(...args) {
    // Always log errors, but sanitize in production
    console.error(...this.sanitizeArgs(args));
  }

  warn(...args) {
    if (isDevelopment) {
      console.warn(...this.sanitizeArgs(args));
    }
  }

  info(...args) {
    if (isDevelopment) {
      console.info(...this.sanitizeArgs(args));
    }
  }

  /**
   * Sanitize arguments to remove sensitive data
   * @param {Array} args - Arguments to sanitize
   * @returns {Array} Sanitized arguments
   */
  sanitizeArgs(args) {
    if (isDevelopment) {
      return args; // Show everything in development
    }

    return args.map(arg => {
      if (typeof arg === 'string') {
        // Remove email addresses
        arg = arg.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
        // Remove potential passwords (long strings)
        if (arg.length > 50 && /password/i.test(arg)) {
          return '[PASSWORD_REDACTED]';
        }
      } else if (typeof arg === 'object' && arg !== null) {
        // Recursively sanitize objects
        return this.sanitizeObject(arg);
      }
      return arg;
    });
  }

  /**
   * Sanitize object to remove sensitive fields
   * @param {object} obj - Object to sanitize
   * @returns {object} Sanitized object
   */
  sanitizeObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sensitiveKeys = ['password', 'email', 'token', 'auth', 'credential', 'secret', 'key'];
    const sanitized = { ...obj };

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeObject(sanitized[key]);
      }
    }

    return sanitized;
  }
}

export const logger = new Logger();

// Convenience exports
export const log = (...args) => logger.log(...args);
export const logError = (...args) => logger.error(...args);
export const logWarn = (...args) => logger.warn(...args);
export const logInfo = (...args) => logger.info(...args);
