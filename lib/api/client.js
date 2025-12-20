/**
 * Main API client for hOn
 * Ported from pyhOn api.py
 */

const axios = require('axios');
const constants = require('../config/constants');
const { 
  NoAuthenticationException, 
  HonAuthenticationError 
} = require('../utils/exceptions');
const { HonAuth } = require('../auth/authenticator');
const HonDevice = require('../auth/device');
const HonConnectionHandler = require('./handlers/hon');
const HonAnonymousConnectionHandler = require('./handlers/anonym');

/**
 * Main API client class
 */
class HonAPI {
  constructor(authOrOptions = {}) {
    // Check if first argument is a HonAuth instance
    if (authOrOptions && authOrOptions.constructor && authOrOptions.constructor.name === 'HonAuth') {
      // Direct auth instance provided
      this._email = '';
      this._password = '';
      this._anonymous = false;
      this._mobileId = '';
      this._refreshToken = '';
      this._session = authOrOptions._session;
      this._honHandler = new HonConnectionHandler(authOrOptions, authOrOptions._session);
      this._honAnonymousHandler = null;
    } else {
      // Options object provided
      const {
        email = '',
        password = '',
        anonymous = false,
        mobileId = '',
        refreshToken = '',
        session = null
      } = authOrOptions;

      this._email = email;
      this._password = password;
      this._anonymous = anonymous;
      this._mobileId = mobileId;
      this._refreshToken = refreshToken;
      this._honHandler = null;
      this._honAnonymousHandler = null;
      this._session = session || axios.create({
        timeout: 30000,
        withCredentials: true
      });
    }
  }

  /**
   * Get authentication instance
   * @returns {HonAuth} Authentication instance
   */
  get auth() {
    if (!this._honHandler || !this._honHandler._auth) {
      throw new NoAuthenticationException();
    }
    return this._honHandler._auth;
  }

  /**
   * Get authenticated connection handler
   * @returns {HonConnectionHandler} Authenticated handler
   * @private
   */
  get _hon() {
    if (!this._honHandler) {
      throw new NoAuthenticationException();
    }
    return this._honHandler;
  }

  /**
   * Get anonymous connection handler
   * @returns {HonAnonymousConnectionHandler} Anonymous handler
   * @private
   */
  get _honAnonymous() {
    if (!this._honAnonymousHandler) {
      throw new NoAuthenticationException();
    }
    return this._honAnonymousHandler;
  }

  /**
   * Log debug messages (only if debug mode is enabled in auth)
   * @private
   * @param {...any} args - Arguments to log
   */
  _debugLog(...args) {
    try {
      if (this._honHandler && this._honHandler._auth && this._honHandler._auth._debug) {
        console.log(...args);
      }
    } catch (error) {
      // Silently ignore if auth not available
    }
  }

  /**
   * Initialize the API client
   * @returns {Promise<HonAPI>} Initialized client
   */
  async create() {
    // Always create anonymous handler
    this._honAnonymousHandler = await HonAnonymousConnectionHandler.create(this._session);

    // Create authenticated handler if not anonymous
    if (!this._anonymous) {
      const device = new HonDevice(this._mobileId);
      const auth = new HonAuth(this._session, this._email, this._password, device);
      
      // If refresh token is provided, try to use it
      if (this._refreshToken) {
        auth._auth.refreshToken = this._refreshToken;
        try {
          const refreshed = await auth.refresh();
          if (!refreshed) {
            // If refresh fails, fall back to full authentication
            await auth.authenticate();
          }
        } catch (error) {
          // If refresh fails, fall back to full authentication
          await auth.authenticate();
        }
      } else {
        // Perform full authentication
        await auth.authenticate();
      }

      this._honHandler = new HonConnectionHandler(auth, this._session);
    }

    return this;
  }

  /**
   * Load appliances from the API
   * @returns {Promise<Array>} List of appliances
   */
  async loadAppliances() {
    try {
      const response = await this._hon.get(`${constants.API_URL}/commands/v1/appliance`);
      const result = response.data;
      
      if (result && result.payload && result.payload.appliances) {
        return result.payload.appliances;
      }
      
      return [];
    } catch (error) {
      throw new HonAuthenticationError(`Failed to load appliances: ${error.message}`);
    }
  }

  /**
   * Load commands for a specific appliance
   * @param {Object} appliance - Appliance object
   * @returns {Promise<Object>} Commands data
   */
  async loadCommands(appliance) {
    // Check for required fields
    if (!appliance.applianceType && !appliance.info.applianceTypeName) {
      this._debugLog('⚠️  Appliance type missing, skipping commands load');
      return {};
    }

    const params = {
      applianceType: appliance.applianceType || appliance.info.applianceTypeName,
      macAddress: appliance.macAddress || appliance.info.serialNumber,
      os: constants.OS,
      appVersion: constants.APP_VERSION,
      code: appliance.code || appliance.info.code
    };

    // Add applianceModelId only if present (not all devices have it)
    const modelId = appliance.applianceModelId || appliance.info.applianceModelId;
    if (modelId) {
      params.applianceModelId = modelId;
    }

    // Add optional parameters
    if (appliance.info?.eepromId) {
      params.firmwareId = appliance.info.eepromId;
    }
    if (appliance.info?.fwVersion) {
      params.fwVersion = appliance.info.fwVersion;
    }
    if (appliance.info?.series) {
      params.series = appliance.info.series;
    }

    this._debugLog('🔍 Loading commands with params:', JSON.stringify(params, null, 2));

    try {
      const url = `${constants.API_URL}/commands/v1/retrieve`;
      const response = await this._hon.get(url, { params });
      const result = response.data?.payload || {};
      
      if (!result || result.resultCode !== '0') {
        this._debugLog('⚠️  Commands load returned non-zero result code or empty response');
        this._debugLog('   This might be a virtual/unsupported device');
        return {};
      }
      
      delete result.resultCode;
      this._debugLog(`✅ Commands loaded successfully (${Object.keys(result).length} items)`);
      return result;
    } catch (error) {
      console.error('⚠️  Load commands error:', error.response?.data?.error || error.message);
      this._debugLog('   Returning empty commands (device might not support commands)');
      return {}; // Return empty instead of throwing - some devices don't have commands
    }
  }

  /**
   * Load command history for appliance
   * @param {Object} appliance - Appliance object
   * @returns {Promise<Array>} Command history
   */
  async loadCommandHistory(appliance) {
    try {
      const url = `${constants.API_URL}/commands/v1/appliance/${appliance.macAddress}/history`;
      const response = await this._hon.get(url);
      const result = response.data;
      
      if (!result || !result.payload) {
        return [];
      }
      
      return result.payload.history || [];
    } catch (error) {
      console.error('Failed to load command history:', error.message);
      return [];
    }
  }

  /**
   * Load favourites for appliance
   * @param {Object} appliance - Appliance object
   * @returns {Promise<Array>} Favourites
   */
  async loadFavourites(appliance) {
    try {
      const url = `${constants.API_URL}/commands/v1/appliance/${appliance.macAddress}/favourite`;
      const response = await this._hon.get(url);
      const result = response.data;
      
      if (!result || !result.payload) {
        return [];
      }
      
      return result.payload.favourites || [];
    } catch (error) {
      console.error('Failed to load favourites:', error.message);
      return [];
    }
  }

  /**
   * Load last activity for appliance
   * @param {Object} appliance - Appliance object
   * @returns {Promise<Object>} Last activity
   */
  async loadLastActivity(appliance) {
    try {
      const url = `${constants.API_URL}/commands/v1/retrieve-last-activity`;
      const params = { macAddress: appliance.macAddress };
      const response = await this._hon.get(url, { params });
      const result = response.data;
      
      if (result && result.attributes) {
        return result.attributes;
      }
      
      return {};
    } catch (error) {
      console.error('Failed to load last activity:', error.message);
      return {};
    }
  }

  /**
   * Load appliance model data
   * @param {Object} appliance - Appliance object
   * @returns {Promise<Object>} Appliance model data
   */
  async loadApplianceData(appliance) {
    try {
      const url = `${constants.API_URL}/commands/v1/appliance-model`;
      const params = {
        code: appliance.code,
        macAddress: appliance.macAddress
      };
      const response = await this._hon.get(url, { params });
      const result = response.data;
      
      if (result && result.payload && result.payload.applianceModel) {
        return result.payload.applianceModel;
      }
      
      return {};
    } catch (error) {
      console.error('Failed to load appliance data:', error.message);
      return {};
    }
  }

  /**
   * Load attributes for appliance
   * @param {Object} appliance - Appliance object
   * @returns {Promise<Object>} Attributes
   */
  async loadAttributes(appliance) {
    try {
      const url = `${constants.API_URL}/commands/v1/context`;
      const params = {
        macAddress: appliance.macAddress,
        applianceType: appliance.applianceType,
        category: 'CYCLE'
      };
      const response = await this._hon.get(url, { params });
      return response.data?.payload || {};
    } catch (error) {
      console.error('Failed to load attributes:', error.message);
      return {};
    }
  }

  /**
   * Load statistics for appliance
   * @param {Object} appliance - Appliance object
   * @returns {Promise<Object>} Statistics
   */
  async loadStatistics(appliance) {
    try {
      const url = `${constants.API_URL}/commands/v1/statistics`;
      const params = {
        macAddress: appliance.macAddress,
        applianceType: appliance.applianceType
      };
      const response = await this._hon.get(url, { params });
      return response.data?.payload || {};
    } catch (error) {
      console.error('Failed to load statistics:', error.message);
      return {};
    }
  }

  /**
   * Load maintenance data for appliance
   * @param {Object} appliance - Appliance object
   * @returns {Promise<Object>} Maintenance data
   */
  async loadMaintenance(appliance) {
    try {
      const url = `${constants.API_URL}/commands/v1/maintenance-cycle`;
      const params = { macAddress: appliance.macAddress };
      const response = await this._hon.get(url, { params });
      return response.data?.payload || {};
    } catch (error) {
      console.error('Failed to load maintenance:', error.message);
      return {};
    }
  }

  /**
   * Send command to appliance
   * @param {Object} appliance - Appliance object
   * @param {string} commandName - Command name
   * @param {Object} parameters - Command parameters
   * @param {Object} ancillaryParameters - Ancillary parameters
   * @param {string} programName - Program name
   * @returns {Promise<boolean>} Success status
   */
  async sendCommand(appliance, commandName, parameters = {}, ancillaryParameters = {}, programName = '') {
    try {
      const url = `${constants.API_URL}/commands/v1/send`;
      const data = {
        macAddress: appliance.macAddress,
        timestamp: new Date().toISOString(),
        commandName: commandName,
        transactionId: `${appliance.macAddress}_${Date.now()}`,
        applianceOptions: appliance.options || {},
        device: this.auth._device.get(),
        attributes: {
          channel: 'mobileApp',
          origin: 'standardProgram',
          energyLabel: '0',
          ...parameters
        },
        ancillaryParameters: {
          programFamily: programName || 'Standard',
          remoteActionable: '1',
          remoteVisible: '1',
          ...ancillaryParameters
        },
        applianceType: appliance.applianceType
      };

      this._debugLog('📤 Sending command to API:');
      this._debugLog('  URL:', url);
      this._debugLog('  Command:', commandName);
      this._debugLog('  Data:', JSON.stringify(data, null, 2));

      const response = await this._hon.post(url, data);
      
      this._debugLog('📥 API response:', JSON.stringify(response.data, null, 2));
      
      return response.data?.payload?.resultCode === '0';
    } catch (error) {
      this._debugLog('❌ Command failed:', error.message);
      if (error.response) {
        this._debugLog('  Status:', error.response.status);
        this._debugLog('  Data:', JSON.stringify(error.response.data, null, 2));
      }
      console.error('Failed to send command:', error.message);
      return false;
    }
  }

  /**
   * Send command to appliance
   * @param {string} macAddress - Appliance MAC address
   * @param {Object} command - Command to send
   * @param {Object} parameters - Command parameters
   * @returns {Promise<Object>} Command response
   */
  async sendCommand(macAddress, command, parameters = {}) {
    const data = {
      macAddress,
      timestamp: new Date().toISOString(),
      commandName: command.name || command,
      transactionId: this._generateTransactionId(),
      applianceOptions: command.applianceOptions || {},
      device: this._honHandler._auth._device.get(),
      attributes: {
        channel: 'mobileApp',
        origin: 'standardProgram',
        energyLabel: '0',
        ...parameters
      },
      ancillaryParameters: {
        programFamily: command.programFamily || 'Standard',
        remoteActionable: '1',
        remoteVisible: '1'
      },
      parameters: parameters
    };

    try {
      const response = await this._hon.post(
        `${constants.API_URL}/commands/v1/send`,
        data
      );
      
      return response.data;
    } catch (error) {
      throw new HonAuthenticationError(`Failed to send command: ${error.message}`);
    }
  }

  /**
   * Get appliance statistics
   * @param {Object} appliance - Appliance object
   * @returns {Promise<Object>} Statistics data
   */
  async getStatistics(appliance) {
    const params = {
      macAddress: appliance.macAddress,
      applianceType: appliance.applianceType,
      applianceModelId: appliance.applianceModelId
    };

    try {
      const response = await this._hon.get(`${constants.API_URL}/commands/v1/statistics`, {
        params
      });
      
      return response.data;
    } catch (error) {
      throw new HonAuthenticationError(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * Get appliance maintenance info
   * @param {Object} appliance - Appliance object
   * @returns {Promise<Object>} Maintenance data
   */
  async getMaintenance(appliance) {
    const params = {
      macAddress: appliance.macAddress,
      applianceType: appliance.applianceType,
      applianceModelId: appliance.applianceModelId
    };

    try {
      const response = await this._hon.get(`${constants.API_URL}/commands/v1/maintenance`, {
        params
      });
      
      return response.data;
    } catch (error) {
      throw new HonAuthenticationError(`Failed to get maintenance info: ${error.message}`);
    }
  }

  /**
   * Generate transaction ID for commands
   * @returns {string} Transaction ID
   * @private
   */
  _generateTransactionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load AWS IoT token for MQTT authentication
   * Required for WebSocket connection to AWS IoT Core
   * @returns {Promise<string>} AWS tokenSigned for custom authorizer
   */
  async loadAwsToken() {
    try {
      const url = `${constants.API_URL}/auth/v1/introspection`;
      const response = await this._honHandler.get(url);
      const introspection = response.data?.payload || {};
      return introspection.tokenSigned || '';
    } catch (error) {
      console.error('Failed to load AWS token:', error.message);
      throw error;
    }
  }

  /**
   * Close the API client and cleanup resources
   */
  async close() {
    // Implementation depends on how axios handles cleanup
    // For now, just clear authentication
    if (this._honHandler && this._honHandler._auth) {
      this._honHandler._auth.clear();
    }
  }
}

// Legacy compatibility
class ApiClient extends HonAPI {
    constructor(baseUrl) {
        super({ anonymous: true });
        this.baseUrl = baseUrl;
        this.headers = {
            'Content-Type': 'application/json',
        };
    }

    async login(credentials) {
        const response = await fetch(`${this.baseUrl}/login`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(credentials),
        });
        return this.handleResponse(response);
    }

    async logout(token) {
        const response = await fetch(`${this.baseUrl}/logout`, {
            method: 'POST',
            headers: {
                ...this.headers,
                'Authorization': `Bearer ${token}`,
            },
        });
        return this.handleResponse(response);
    }

    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'An error occurred');
        }
        return response.json();
    }
}

module.exports = { HonAPI, ApiClient };