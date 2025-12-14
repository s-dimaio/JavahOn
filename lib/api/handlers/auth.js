/**
 * Authentication connection handler
 * Ported from pyhOn handler/auth.py
 */

const ConnectionHandler = require('./base');
const constants = require('../../config/constants');

class HonAuthConnectionHandler extends ConnectionHandler {
  constructor(session = null) {
    super(session);
    this._headers = {
      'user-agent': constants.USER_AGENT
    };
    this._calledUrls = [];
  }

  get calledUrls() {
    return this._calledUrls;
  }

  set calledUrls(urls) {
    this._calledUrls = urls;
  }

  /**
   * Intercept and log requests
   * @param {Function} method - HTTP method function
   * @param {string} url - URL to request
   * @param {Object} config - Request config
   * @returns {Promise<Object>} Response
   */
  async _intercept(method, url, config = {}) {
    const mergedConfig = {
      ...config,
      headers: {
        ...this._headers,
        ...(config.headers || {})
      }
    };

    try {
      const response = await method(url, mergedConfig);
      this._calledUrls.push([response.status, response.config.url]);
      return response;
    } catch (error) {
      if (error.response) {
        this._calledUrls.push([error.response.status, error.config.url]);
      }
      throw error;
    }
  }

  /**
   * Perform GET request with interception
   * @param {string} url - URL to request
   * @param {Object} config - Axios config
   * @returns {Promise<Object>} Response
   */
  async get(url, config = {}) {
    return this._intercept(this._session.get.bind(this._session), url, config);
  }

  /**
   * Perform POST request with interception
   * @param {string} url - URL to request
   * @param {Object} data - Data to send
   * @param {Object} config - Axios config
   * @returns {Promise<Object>} Response
   */
  async post(url, data = {}, config = {}) {
    // Bind the method properly with data
    const boundPost = (url, cfg) => this._session.post(url, data, cfg);
    return this._intercept(boundPost, url, config);
  }
}

module.exports = HonAuthConnectionHandler;