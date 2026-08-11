export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  NOT_FOUND: 'Resource not found',
  ROUTE_NOT_FOUND: 'The requested route does not exist',
  VALIDATION_ERROR: 'Validation error',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  DATABASE_CONNECTION_ERROR: 'Failed to connect to MongoDB database',
  REDIS_CONNECTION_ERROR: 'Failed to connect to Redis cache store',
} as const;
