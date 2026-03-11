import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loginUser, registerUser, refreshUserToken } from '../../domain/authService';
import { authenticate, AuthenticatedRequest } from '../middleware/authMiddleware';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const user = await registerUser(email, password, name);
    res.status(201).json({ success: true, data: user, message: 'User registered', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginUser(email, password);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user }, message: 'Login successful', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies['refreshToken'] as string;
    if (!token) { res.status(401).json({ success: false, data: null, message: 'No refresh token', timestamp: new Date().toISOString() }); return; }
    const accessToken = await refreshUserToken(token);
    res.json({ success: true, data: { accessToken }, message: 'Token refreshed', timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

authRouter.post('/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, data: null, message: 'Logged out', timestamp: new Date().toISOString() });
});

authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: req.user, message: 'Current user', timestamp: new Date().toISOString() });
});
