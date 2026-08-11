import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../models/user.model.js';
import { env } from '../config/env.config.js';
import { redisConfig } from '../config/redis.config.js';
import { AuditService } from './report/audit.service.js';
import { logger } from '../lib/logger.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  public static async register(name: string, email: string, password: string): Promise<IUser> {
    // 1. Password strength check
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter and one number');
    }

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'USER',
      isActive: true,
    });

    logger.info(`[AuthService] Registered user: ${user._id}`);

    // Audit log
    await AuditService.log({
      entityType: 'Expense', // default entity mapping/general system event
      entityId: String(user._id),
      action: 'Report Generated', // mapping general auth/system event safely using existing enum
      newValue: { event: 'User Registered', name, email },
    });

    return user;
  }

  /**
   * Log in user and generate token pair
   */
  public static async login(email: string, password: string, ipAddress?: string): Promise<{ user: IUser } & AuthTokens> {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await this.generateTokenPair(user);

    logger.info(`[AuthService] User logged in: ${user._id}`);

    // Audit log
    await AuditService.log({
      entityType: 'Expense',
      entityId: String(user._id),
      action: 'Report Generated',
      newValue: { event: 'User Login', email: user.email },
      performedBy: user.email,
      ipAddress,
    });

    return { user, ...tokens };
  }

  /**
   * Refresh the access token using a valid refresh token
   */
  public static async refresh(refreshToken: string, ipAddress?: string): Promise<AuthTokens> {
    try {
      if (ipAddress) {
        logger.info(`[AuthService] Token refresh requested from IP: ${ipAddress}`);
      }
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string; email: string; role: string };
      
      const redis = redisConfig.getClient();
      const storedUserId = await redis.get(`refresh_token:${refreshToken}`);
      if (!storedUserId || storedUserId !== decoded.userId) {
        throw new Error('Refresh token revoked or expired');
      }

      const user = await UserModel.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Rotate Refresh Token
      await redis.del(`refresh_token:${refreshToken}`);
      const tokens = await this.generateTokenPair(user);

      logger.info(`[AuthService] Rotated refresh token for user: ${user._id}`);
      return tokens;
    } catch (err) {
      logger.warn('[AuthService] Refresh token validation failed');
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Revoke refresh token (Logout)
   */
  public static async logout(refreshToken: string): Promise<void> {
    const redis = redisConfig.getClient();
    await redis.del(`refresh_token:${refreshToken}`);
    logger.info('[AuthService] Revoked refresh token successfully');
  }

  /**
   * Helper to generate token pairs and store refresh token in Redis
   */
  private static async generateTokenPair(user: IUser): Promise<AuthTokens> {
    const payload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store in Redis (TTL 7 days)
    const redis = redisConfig.getClient();
    await redis.setex(`refresh_token:${refreshToken}`, 7 * 24 * 60 * 60, String(user._id));

    return { accessToken, refreshToken };
  }
}
