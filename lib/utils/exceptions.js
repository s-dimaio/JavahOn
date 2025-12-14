/**
 * Custom exception classes for hOn library
 * Provides specialized error types for authentication and API operations
 * Ported from pyhOn exceptions.py
 * @module utils/exceptions
 */

/**
 * Error thrown when authentication fails
 * @class
 * @extends Error
 * @example
 * throw new HonAuthenticationError('Invalid credentials');
 */
class HonAuthenticationError extends Error {
  /**
   * Creates a new authentication error
   * @public
   * @param {string} [message='Authentication failed'] - Error message
   */
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'HonAuthenticationError';
  }
}

/**
 * Error indicating that authentication is not needed (already authenticated)
 * @class
 * @extends Error
 * @example
 * throw new HonNoAuthenticationNeeded('Already logged in');
 */
class HonNoAuthenticationNeeded extends Error {
  /**
   * Creates a new no-authentication-needed error
   * @public
   * @param {string} [message='No authentication needed - already authenticated'] - Error message
   */
  constructor(message = 'No authentication needed - already authenticated') {
    super(message);
    this.name = 'HonNoAuthenticationNeeded';
  }
}

/**
 * Error thrown when no session is available
 * @class
 * @extends Error
 * @example
 * if (!session) throw new NoSessionException();
 */
class NoSessionException extends Error {
  /**
   * Creates a new no-session exception
   * @public
   * @param {string} [message='No session available'] - Error message
   */
  constructor(message = 'No session available') {
    super(message);
    this.name = 'NoSessionException';
  }
}

/**
 * Error thrown when authentication data is missing
 * @class
 * @extends Error
 * @example
 * throw new NoAuthenticationException('Token missing');
 */
class NoAuthenticationException extends Error {
  /**
   * Creates a new no-authentication exception
   * @public
   * @param {string} [message='No authentication available'] - Error message
   */
  constructor(message = 'No authentication available') {
    super(message);
    this.name = 'NoAuthenticationException';
  }
}

/**
 * General API error for failed API requests
 * @class
 * @extends Error
 * @example
 * throw new ApiError('Failed to fetch appliances');
 */
class ApiError extends Error {
  /**
   * Creates a new API error
   * @public
   * @param {string} [message='API error occurred'] - Error message
   */
  constructor(message = 'API error occurred') {
    super(message);
    this.name = 'ApiError';
  }
}

module.exports = {
  HonAuthenticationError,
  HonNoAuthenticationNeeded,
  NoSessionException,
  NoAuthenticationException,
  ApiError
};