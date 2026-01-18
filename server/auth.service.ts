import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  family_id?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT tokens
 */
export function generateTokens(userId: string, email: string, role: string): AuthTokens {
  const accessToken = jwt.sign(
    { userId, email, role } as JWTPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  const refreshToken = randomUUID();

  return {
    accessToken,
    refreshToken,
    user: {} as User, // Will be populated by caller
  };
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Create a new user
 */
export async function createUser(
  pool: Pool,
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'user' = 'user',
  family_id?: string
): Promise<User> {
  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  const result = await pool.query(
    `INSERT INTO users (id, email, password_hash, name, role, family_id, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING id, email, name, role, family_id, is_active, created_at, last_login`,
    [userId, email, passwordHash, name, role, family_id || null, true]
  );

  return result.rows[0];
}

/**
 * Find user by email
 */
export async function getUserByEmail(pool: Pool, email: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id, email, name, role, family_id, is_active, created_at, last_login FROM users WHERE email = $1',
    [email]
  );

  return result.rows[0] || null;
}

/**
 * Get user with password hash (for login)
 */
export async function getUserWithPassword(
  pool: Pool,
  email: string
): Promise<(User & { password_hash: string }) | null> {
  const result = await pool.query(
    'SELECT id, email, name, role, family_id, is_active, password_hash, created_at, last_login FROM users WHERE email = $1',
    [email]
  );

  return result.rows[0] || null;
}

/**
 * Get user by ID
 */
export async function getUserById(pool: Pool, userId: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id, email, name, role, family_id, is_active, created_at, last_login FROM users WHERE id = $1',
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * Update last login
 */
export async function updateLastLogin(pool: Pool, userId: string): Promise<void> {
  await pool.query(
    'UPDATE users SET last_login = NOW() WHERE id = $1',
    [userId]
  );
}

/**
 * Store refresh token session
 */
export async function createSession(
  pool: Pool,
  userId: string,
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string,
  expiresAt?: Date
): Promise<void> {
  const expires = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

  await pool.query(
    `INSERT INTO user_sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [randomUUID(), userId, refreshToken, ipAddress || null, userAgent || null, expires]
  );
}

/**
 * Verify refresh token exists and is valid
 */
export async function verifyRefreshToken(
  pool: Pool,
  userId: string,
  refreshToken: string
): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM user_sessions 
     WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW()`,
    [userId, refreshToken]
  );

  return result.rows.length > 0;
}

/**
 * Invalidate refresh token
 */
export async function invalidateRefreshToken(pool: Pool, refreshToken: string): Promise<void> {
  await pool.query(
    'DELETE FROM user_sessions WHERE refresh_token = $1',
    [refreshToken]
  );
}

/**
 * Get all users (for admin)
 */
export async function getAllUsers(pool: Pool): Promise<User[]> {
  const result = await pool.query(
    'SELECT id, email, name, role, family_id, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
  );

  return result.rows;
}

/**
 * Update user
 */
export async function updateUser(
  pool: Pool,
  userId: string,
  updates: {
    name?: string;
    email?: string;
    role?: string;
    family_id?: string;
    is_active?: boolean;
  }
): Promise<User | null> {
  const allowedFields = ['name', 'email', 'role', 'family_id', 'is_active'];
  const fields = Object.keys(updates).filter(k => allowedFields.includes(k));

  if (fields.length === 0) return getUserById(pool, userId);

  const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
  const values = fields.map(field => updates[field as keyof typeof updates]);

  const result = await pool.query(
    `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1}
     RETURNING id, email, name, role, family_id, is_active, created_at, last_login`,
    [...values, userId]
  );

  return result.rows[0] || null;
}

/**
 * Delete user
 */
export async function deleteUser(pool: Pool, userId: string): Promise<void> {
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}

/**
 * Initialize admin user if not exists
 */
export async function initializeAdmin(pool: Pool): Promise<void> {
  const adminEmail = 'admin@openfamily.local';
  const existing = await getUserByEmail(pool, adminEmail);

  if (!existing) {
    await createUser(pool, adminEmail, 'admin123', 'Admin', 'admin');
    console.log('✅ Admin user created: admin@openfamily.local / admin123');
  }
}
