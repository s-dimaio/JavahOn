/**
 * Base HTTP connection handler with automatic cookie management
 * Provides HTTP methods (GET, POST, PUT, DELETE) with persistent cookie jar
 * Ported from pyhOn handler/base.py
 * @module api/handlers/base
 */

const axios = require('axios');
const tough = require('tough-cookie');
const constants = require('../../config/constants');
const { NoSessionException } = require('../../utils/exceptions');

/**
 * Base connection handler class
 * Manages HTTP requests with automatic cookie persistence using tough-cookie
 * @class
 * @example
 * const handler = new ConnectionHandler();
 * const response = await handler.get('https://api.example.com/data');
 */
class ConnectionHandler {
  /**
   * Creates a new connection handler
   * @public
   * @param {Object} [session=null] - Existing axios session (creates new if not provided)
   * @param {boolean} [debug=false] - Enable debug logging
   * @example
   * // Create with default session
   * const handler = new ConnectionHandler();
   * 
   * // Share session between handlers
   * const session = axios.create();
   * const handler1 = new ConnectionHandler(session);
   * const handler2 = new ConnectionHandler(session); // Shares cookies
   */
  constructor(session = null, debug = false) {
    this._debug = debug;
    this._headers = {
      'user-agent': constants.USER_AGENT,
      'Content-Type': 'application/json'
    };
    
    if (session) {
      this._session = session;
      // Share the cookie jar if it exists on the session
      this._cookieJar = session._cookieJar || new tough.CookieJar();
      // Store reference on session for future handlers
      if (!session._cookieJar) {
        session._cookieJar = this._cookieJar;
        // Setup interceptors if not already done
        this._setupCookieInterceptors();
      }
    } else {
      // Create axios instance with manual cookie management
      this._cookieJar = new tough.CookieJar();
      this._session = axios.create();
      // Store cookie jar on session for sharing
      this._session._cookieJar = this._cookieJar;
      // Setup interceptors
      this._setupCookieInterceptors();
    }
  }

  /**
   * Log debug messages (only if debug mode is enabled)
   * @private
   * @param {...any} args - Arguments to log
   */
  _debugLog(...args) {
    if (this._debug) {
      console.log(...args);
    }
  }

  /**
   * Sets up axios interceptors for automatic cookie management
   * Injects cookies on requests and stores cookies from responses
   * @private
   */
  _setupCookieInterceptors() {
    // Add request interceptor to inject cookies
    this._session.interceptors.request.use(async (config) => {
      if (config.url) {
        const cookieString = await this._cookieJar.getCookieString(config.url);
        if (cookieString) {
          this._debugLog(`🍪 Sending cookies to ${config.url.substring(0, 60)}...`);
          this._debugLog(`🍪 Cookie count: ${cookieString.split(';').length} cookies`);
          config.headers.Cookie = cookieString;
        } else {
          this._debugLog(`⚠️ No cookies to send to ${config.url.substring(0, 60)}...`);
        }
      }
      return config;
    });
    
    // Add response interceptor to save cookies
    this._session.interceptors.response.use(
      async (response) => {
        const setCookieHeaders = response.headers['set-cookie'];
        if (setCookieHeaders && response.config.url) {
          this._debugLog(`🍪 Received ${setCookieHeaders.length} cookies from ${response.config.url.substring(0, 60)}...`);
          for (const cookie of setCookieHeaders) {
            await this._cookieJar.setCookie(cookie, response.config.url);
            this._debugLog(`🍪 Stored: ${cookie.split(';')[0]}`);
          }
        }
        return response;
      },
      async (error) => {
        // Also save cookies on error responses
        if (error.response) {
          const setCookieHeaders = error.response.headers['set-cookie'];
          if (setCookieHeaders && error.config.url) {
            for (const cookie of setCookieHeaders) {
              await this._cookieJar.setCookie(cookie, error.config.url);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Gets the axios session instance
   * @public
   * @returns {Object} Axios session
   * @throws {NoSessionException} If no session is available
   * @example
   * const session = handler.session;
   */
  get session() {
    if (!this._session) {
      throw new NoSessionException();
    }
    return this._session;
  }

  /**
   * Performs HTTP GET request
   * @public
   * @param {string} url - URL to request
   * @param {Object} [config={}] - Axios configuration options
   * @returns {Promise<Object>} Axios response object
   * @example
   * const response = await handler.get('https://api.hon.com/appliances');
   * console.log(response.data);
   */
  async get(url, config = {}) {
    const mergedConfig = {
      ...config,
      headers: {
        ...this._headers,
        ...(config.headers || {})
      }
    };
    
    return this._session.get(url, mergedConfig);
  }

  /**
   * Performs HTTP POST request
   * @public
   * @param {string} url - URL to request
   * @param {Object} [data={}] - Data to send in request body
   * @param {Object} [config={}] - Axios configuration options
   * @returns {Promise<Object>} Axios response object
   * @example
   * const response = await handler.post('https://api.hon.com/auth/login', {
   *   email: 'user@email.com',
   *   password: 'secret'
   * });
   */
  async post(url, data = {}, config = {}) {
    const mergedConfig = {
      ...config,
      headers: {
        ...this._headers,
        ...(config.headers || {})
      }
    };
    
    return this._session.post(url, data, mergedConfig);
  }

  /**
   * Performs HTTP PUT request
   * @public
   * @param {string} url - URL to request
   * @param {Object} [data={}] - Data to send in request body
   * @param {Object} [config={}] - Axios configuration options
   * @returns {Promise<Object>} Axios response object
   * @example
   * const response = await handler.put('https://api.hon.com/appliances/123', {
   *   status: 'updated'
   * });
   */
  async put(url, data = {}, config = {}) {
    const mergedConfig = {
      ...config,
      headers: {
        ...this._headers,
        ...(config.headers || {})
      }
    };
    
    return this._session.put(url, data, mergedConfig);
  }

  /**
   * Performs HTTP DELETE request
   * @public
   * @param {string} url - URL to request
   * @param {Object} [config={}] - Axios configuration options
   * @returns {Promise<Object>} Axios response object
   * @example
   * const response = await handler.delete('https://api.hon.com/appliances/123');
   */
  async delete(url, config = {}) {
    const mergedConfig = {
      ...config,
      headers: {
        ...this._headers,
        ...(config.headers || {})
      }
    };
    
    return this._session.delete(url, mergedConfig);
  }
}

module.exports = ConnectionHandler;