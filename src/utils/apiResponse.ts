import { Response } from 'express';
import { STATUS_CODES, StatusCode } from '../constants/statusCodes.js';

export interface ApiResponseOptions<T> {
  res: Response;
  statusCode?: StatusCode;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export class ApiResponse {
  public static success<T>({
    res,
    statusCode = STATUS_CODES.OK,
    message = 'Success',
    data,
    meta,
  }: ApiResponseOptions<T>): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data !== undefined && { data }),
      ...(meta !== undefined && { meta }),
      timestamp: new Date().toISOString(),
    });
  }

  public static error({
    res,
    statusCode = STATUS_CODES.INTERNAL_SERVER_ERROR,
    message = 'An error occurred',
    errors,
  }: {
    res: Response;
    statusCode?: StatusCode;
    message?: string;
    errors?: unknown;
  }): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors !== undefined && { errors }),
      timestamp: new Date().toISOString(),
    });
  }
}
