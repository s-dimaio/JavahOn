/**
 * hOn API connection handler for authenticated requests
 * Ported from pyhOn handler/hon.py
 */

const ConnectionHandler = require('./base');
const constants = require('../../config/constants');

class HonConnectionHandler extends ConnectionHandler {
  constructor(auth, session = null) {
    super(session, auth._debug || false);  // Pass debug flag to parent
    this._auth = auth;
    this._headers = {
      ...this._headers,
      'cognito-token': '',
      'id-token': '',
      'x-api-key': constants.API_KEY
    };
  }

  /**
   * Log debug messages (only if debug mode is enabled in auth)
   * @private
   * @param {...any} args - Arguments to log
   */
  _debugLog(...args) {
    if (this._auth && this._auth._debug) {
      console.log(...args);
    }
  }

  /**
   * Update authentication headers
   * @private
   */
  async _checkHeaders() {
    // Ensure tokens are valid
    if (!this._auth.cognitoToken || !this._auth.idToken) {
      throw new Error('Authentication required');
    }
    
    // Check if token is expiring soon and refresh if needed
    if (this._auth.tokenExpiresSoon) {
      this._debugLog('🔄 Token expiring soon, attempting refresh...');
      await this._auth.refresh();
    }
    
    // Update headers with current tokens
    this._headers['cognito-token'] = this._auth.cognitoToken;
    this._headers['id-token'] = this._auth.idToken;
  }

  /**
   * Perform GET request with auth headers
   * @param {string} url - URL to request
   * @param {Object} config - Axios config
   * @returns {Promise<Object>} Response
   */
  async get(url, config = {}) {
    await this._checkHeaders();
    return super.get(url, config);
  }

  /**
   * Perform POST request with auth headers
   * @param {string} url - URL to request
   * @param {Object} data - Data to send
   * @param {Object} config - Axios config
   * @returns {Promise<Object>} Response
   */
  async post(url, data = {}, config = {}) {
    await this._checkHeaders();
    return super.post(url, data, config);
  }

  /**
   * Perform PUT request with auth headers
   * @param {string} url - URL to request
   * @param {Object} data - Data to send
   * @param {Object} config - Axios config
   * @returns {Promise<Object>} Response
   */
  async put(url, data = {}, config = {}) {
    await this._checkHeaders();
    return super.put(url, data, config);
  }

  /**
   * Perform DELETE request with auth headers
   * @param {string} url - URL to request
   * @param {Object} config - Axios config
   * @returns {Promise<Object>} Response
   */
  async delete(url, config = {}) {
    await this._checkHeaders();
    return super.delete(url, config);
  }
}

module.exports = HonConnectionHandler;