/**
 * Production-safe logging utility
 * Logs only in development, can be extended to send to analytics in production
 */

const isDev = __DEV__;

export const logger = {
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },
  
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
    // In production, could send to error tracking service
    // Sentry.captureMessage(args.join(' '), 'warning');
  },
  
  error: (...args) => {
    if (isDev) {
      console.error(...args);
    }
    // In production, send to error tracking service
    // Sentry.captureException(new Error(args.join(' ')));
  },
  
  debug: (...args) => {
    if (isDev) {
      console.debug(...args);
    }
  },
  
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },
};

export default logger;

