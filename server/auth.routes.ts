import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import {
  createUser,
  getUserByEmail,
  getUserWithPassword,
  getUserById,
  updateLastLogin,
  verifyPassword,
  generateTokens,
  createSession,
  verifyRefreshToken,
  invalidateRefreshToken,
  getAllUsers,
  updateUser,
  deleteUser,
  initializeAdmin,
} from './auth.service.js';

// Middleware to extract and verify JWT token
export function authMiddleware(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-key-change-in-production');
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware to check admin role
export function adminMiddleware(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export async function createAuthRoutes(pool: Pool): Promise<Router> {
  const router = Router();

  // Attach pool to req FIRST - this middleware runs for all routes
  router.use((req, res, next) => {
    (req as any).pool = pool;
    next();
  });

  // Initialize admin user on startup
  await initializeAdmin(pool);

  /**
   * POST /auth/signup
   * Register a new user
   */
  router.post('/signup', async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;
      const pool = (req as any).pool as Pool;

      // Validation
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check if user exists
      const existing = await getUserByEmail(pool, email);
      if (existing) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Create user
      const user = await createUser(pool, email, password, name);

      // Generate tokens
      const tokens = generateTokens(user.id, user.email, user.role);
      tokens.user = user;

      // Create session
      await createSession(pool, user.id, tokens.refreshToken);

      // Update last login
      await updateLastLogin(pool, user.id);

      res.status(201).json(tokens);
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Signup failed' });
    }
  });

  /**
   * POST /auth/signin
   * Login user
   */
  router.post('/signin', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const pool = (req as any).pool as Pool;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Get user with password hash
      const userWithPass = await getUserWithPassword(pool, email);
      if (!userWithPass) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const passwordValid = await verifyPassword(password, userWithPass.password_hash);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Remove password from response
      const { password_hash, ...user } = userWithPass;

      // Generate tokens
      const tokens = generateTokens(user.id, user.email, user.role);
      tokens.user = user;

      // Create session
      await createSession(pool, user.id, tokens.refreshToken);

      // Update last login
      await updateLastLogin(pool, user.id);

      res.json(tokens);
    } catch (error) {
      console.error('Signin error:', error);
      res.status(500).json({ error: 'Signin failed' });
    }
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken, userId } = req.body;
      const pool = (req as any).pool as Pool;

      // Validation
      if (!refreshToken || !userId) {
        return res.status(400).json({ error: 'Refresh token and user ID required' });
      }

      // Verify refresh token
      const isValid = await verifyRefreshToken(pool, userId, refreshToken);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Get user
      const user = await getUserById(pool, userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Generate new tokens
      const tokens = generateTokens(user.id, user.email, user.role);
      tokens.user = user;

      // Invalidate old refresh token and create new session
      await invalidateRefreshToken(pool, refreshToken);
      await createSession(pool, user.id, tokens.refreshToken);

      res.json(tokens);
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(500).json({ error: 'Refresh failed' });
    }
  });

  /**
   * POST /auth/logout
   * Logout user (invalidate refresh token)
   */
  router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      const pool = (req as any).pool as Pool;

      if (refreshToken) {
        await invalidateRefreshToken(pool, refreshToken);
      }

      res.json({ message: 'Logged out' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  /**
   * GET /auth/me
   * Get current user info
   */
  router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const pool = (req as any).pool as Pool;

      const currentUser = await getUserById(pool, user.userId);
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(currentUser);
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  /**
   * Admin routes
   */

  /**
   * GET /auth/admin/users
   * Get all users (admin only)
   */
  router.get('/admin/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const pool = (req as any).pool as Pool;
      const users = await getAllUsers(pool);
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  /**
   * PATCH /auth/admin/users/:userId
   * Update user (admin only)
   */
  router.patch('/admin/users/:userId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const pool = (req as any).pool as Pool;
      const updates = req.body;

      const user = await updateUser(pool, userId, updates);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  /**
   * DELETE /auth/admin/users/:userId
   * Delete user (admin only)
   */
  router.delete('/auth/admin/users/:userId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const pool = (req as any).pool as Pool;

      // Prevent deleting the last admin
      const currentUser = (req as any).user;
      if (userId === currentUser.userId) {
        return res.status(400).json({ error: 'Cannot delete your own admin account' });
      }

      await deleteUser(pool, userId);
      res.json({ message: 'User deleted' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  /**
   * POST /auth/admin/users
   * Create user (admin only)
   */
  router.post('/admin/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { email, password, name, role } = req.body;
      const pool = (req as any).pool as Pool;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name required' });
      }

      // Check if user exists
      const existing = await getUserByEmail(pool, email);
      if (existing) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const user = await createUser(pool, email, password, name, role || 'user');
      res.status(201).json(user);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  return router;
}

export default createAuthRoutes;
