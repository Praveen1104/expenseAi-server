import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { UserModel } from '../models/user.model.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { logger } from '../lib/logger.js';

export class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: 'Name, email and password are required.',
        });
        return;
      }

      const user = await AuthService.register(name, email, password);
      
      res.status(STATUS_CODES.CREATED).json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error('[AuthController] Registration failed:', error);
      res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: 'Email and password are required.',
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await AuthService.login(email, password, ipAddress);

      // Set refresh token in secure cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          user: {
            id: result.user._id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken, // also send in body for Zustand client access
        },
      });
    } catch (error) {
      logger.error('[AuthController] Login failed:', error);
      res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid credentials',
      });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  public static async refresh(req: Request, res: Response): Promise<void> {
    try {
      // Parse cookies manually from headers since cookie-parser is not installed
      let refreshToken = req.body.refreshToken;
      if (req.headers.cookie) {
        const cookieMap = Object.fromEntries(
          req.headers.cookie.split(';').map((c) => c.trim().split('='))
        );
        if (cookieMap.refreshToken) {
          refreshToken = decodeURIComponent(cookieMap.refreshToken);
        }
      }

      if (!refreshToken) {
        res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: 'Refresh token is required.',
        });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await AuthService.refresh(refreshToken, ipAddress);

      // Rotate secure cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      logger.error('[AuthController] Token refresh failed:', error);
      res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid refresh token',
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    try {
      let refreshToken = req.body.refreshToken;
      if (req.headers.cookie) {
        const cookieMap = Object.fromEntries(
          req.headers.cookie.split(';').map((c) => c.trim().split('='))
        );
        if (cookieMap.refreshToken) {
          refreshToken = decodeURIComponent(cookieMap.refreshToken);
        }
      }

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      res.clearCookie('refreshToken');
      res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (error) {
      logger.error('[AuthController] Logout failed:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  public static async me(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          error: 'Unauthorized.',
        });
        return;
      }

      const user = await UserModel.findById(authReq.user.userId);
      if (!user) {
        res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          error: 'User not found.',
        });
        return;
      }

      res.status(STATUS_CODES.OK).json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error('[AuthController] Fetch profile failed:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch user profile',
      });
    }
  }
}
