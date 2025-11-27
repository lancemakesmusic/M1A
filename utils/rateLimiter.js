// utils/rateLimiter.js
// Client-side rate limiting for authentication attempts

class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    // Default: 5 attempts per 15 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map(); // email -> { count, firstAttempt, lastAttempt }
  }

  /**
   * Check if an action is allowed for the given identifier
   * @param {string} identifier - Email or other identifier
   * @returns {object} { allowed: boolean, remaining: number, resetAt: Date }
   */
  checkLimit(identifier) {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      // First attempt
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetAt: new Date(now + this.windowMs),
      };
    }

    // Check if window has expired
    if (now - record.firstAttempt > this.windowMs) {
      // Reset window
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetAt: new Date(now + this.windowMs),
      };
    }

    // Check if limit exceeded
    if (record.count >= this.maxAttempts) {
      const resetAt = new Date(record.firstAttempt + this.windowMs);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Increment count
    record.count++;
    record.lastAttempt = now;
    this.attempts.set(identifier, record);

    return {
      allowed: true,
      remaining: this.maxAttempts - record.count,
      resetAt: new Date(record.firstAttempt + this.windowMs),
    };
  }

  /**
   * Record a failed attempt
   * @param {string} identifier - Email or other identifier
   */
  recordFailure(identifier) {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
    } else {
      record.count++;
      record.lastAttempt = now;
      this.attempts.set(identifier, record);
    }
  }

  /**
   * Reset attempts for an identifier (on successful login)
   * @param {string} identifier - Email or other identifier
   */
  reset(identifier) {
    this.attempts.delete(identifier);
  }

  /**
   * Get remaining time until reset (in seconds)
   * @param {string} identifier - Email or other identifier
   * @returns {number} Seconds until reset, or 0 if no limit
   */
  getRemainingTime(identifier) {
    const record = this.attempts.get(identifier);
    if (!record) return 0;

    const now = Date.now();
    const elapsed = now - record.firstAttempt;
    const remaining = this.windowMs - elapsed;

    return Math.max(0, Math.floor(remaining / 1000));
  }
}

// Singleton instance
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

