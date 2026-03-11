import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorMiddleware';

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';
const TOKEN_BYTES = 32;

/**
 * Generate a new CSRF token and set it in a readable (non-httpOnly) cookie.
 * The frontend must read this cookie and echo it back in the X-CSRF-Token header.
 */
export function generateCsrfToken(req: Request, res: Response): void {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
  });
  res.json({
    success: true,
    data: { csrfToken: token },
    message: 'CSRF token issued',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Validate CSRF token for state-mutating cookie-based endpoints.
 * The token must be present in both the cookie and the X-CSRF-Token header,
 * and they must match (double-submit cookie pattern).
 *
 * This middleware is only required for endpoints that rely on cookies for
 * authentication (e.g. /auth/refresh) rather than Bearer tokens.
 * Bearer-token-authenticated endpoints are inherently CSRF-safe.
 */
export function validateCsrfToken(req: Request, _res: Response, next: NextFunction): void {
  const cookieToken = req.cookies[CSRF_COOKIE] as string | undefined;
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken) {
    return next(new AppError(403, 'CSRF token missing'));
  }

  // Use constant-time comparison to prevent timing attacks
  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);

  if (
    cookieBuf.length !== headerBuf.length ||
    !crypto.timingSafeEqual(cookieBuf, headerBuf)
  ) {
    return next(new AppError(403, 'CSRF token mismatch'));
  }

  next();
}
