import rateLimit from 'express-rate-limit';

const limiters: Record<string, ReturnType<typeof rateLimit>> = {};

export function rateLimiter(type: 'auth' | 'ai' | 'default') {
  if (!limiters[type]) {
    const configs = {
      auth: { windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts' },
      ai: { windowMs: 60 * 1000, max: 10, message: 'Too many AI requests' },
      default: { windowMs: 60 * 1000, max: 100, message: 'Too many requests' },
    };
    const cfg = configs[type];
    limiters[type] = rateLimit({
      windowMs: cfg.windowMs,
      max: cfg.max,
      message: {
        success: false,
        data: null,
        message: cfg.message,
        timestamp: new Date().toISOString(),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }
  return limiters[type];
}
