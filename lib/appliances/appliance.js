/**
 * HonAppliance - Main appliance class
 * Ported from pyhOn appliance.py
 */

const HonAttribute = require('./attribute');
const HonCommandLoader = require('./commandLoader');
const { HonParameter, HonParameterRange, HonParameterEnum } = require('../parameters');
const { NoAuthenticationException } = require('../utils/exceptions');

const MINIMAL_UPDATE_INTERVAL = 5; // seconds

class HonAppliance {
  /**
   * @param {Object} api - API instance
   * @param {Object} info - Appliance info
   * @param {number} zone - Zone number (default 0)
   */
  constructor(api, info, zone = 0) {
    // Process attributes if present
    if (info.attributes) {
      const processedAttributes = {};
      for (const attr of info.attributes) {
        if (attr.parName && attr.parValue !== undefined) {
          processedAttributes[attr.parName] = attr.parValue;
        }
      }
      info.attributes = processedAttributes;
    }

    this._info = info;
    this._api = api;
    this._applianceModel = {};
    this._commands = {};
    this._statistics = {};
    this._attributes = {};
    this._zone = zone;
    this._additionalData = {};
    this._lastUpdate = null;
    this._defaultSetting = new HonParameter('', {}, '');
    
    // Check connection status
    const lastConnEvent = this._attributes.lastConnEvent || {};
    this._connection = lastConnEvent.category !== 'DISCONNECTED';

    // Load appliance-specific extras (not implemented yet)
    this._extra = null;
  }

  /**
   * Get nested item from data
   * @param {string} item - Item path (dot notation)
   * @returns {*} Item value
   * @private
   */
  _getNestedItem(item) {
    let result = this.data;
    const keys = item.split('.');

    for (const key of keys) {
      if (/^\d+$/.test(key) && Array.isArray(result)) {
        result = result[parseInt(key)];
      } else if (typeof result === 'object' && result !== null) {
        result = result[key];
      }
    }

    return result;
  }

  /**
   * Get item by key (supports zones and nested paths)
   * @param {string} item - Item key
   * @returns {*} Item value
   */
  get(item) {
    let key = item;
    
    if (this._zone) {
      key = `${item}Z${this._zone}`;
    }

    // Try nested path
    if (key.includes('.')) {
      try {
        return this._getNestedItem(key);
      } catch (error) {
        // Continue to other methods
      }
    }

    // Try data
    if (key in this.data) {
      return this.data[key];
    }

    // Try attributes parameters
    if (this.attributes.parameters && key in this.attributes.parameters) {
      return this.attributes.parameters[key].value;
    }

    // Try info
    if (key in this.info) {
      return this.info[key];
    }

    return undefined;
  }

  /**
   * Check name with zone suffix
   * @param {string} name - Name to check
   * @param {boolean} frontend - Use frontend format
   * @returns {string} Name with zone
   * @private
   */
  _checkNameZone(name, frontend = true) {
    const zone = frontend ? ' Z' : '_z';
    const attribute = this._info[name] || '';
    
    if (attribute && this._zone) {
      return `${attribute}${zone}${this._zone}`;
    }
    
    return attribute;
  }

  /**
   * Get connection status
   * @returns {boolean} Connected status
   */
  get connection() {
    return this._connection;
  }

  /**
   * Set connection status
   * @param {boolean} connection - Connection status
   */
  set connection(connection) {
    this._connection = connection;
  }

  /**
   * Get appliance model ID
   * @returns {string} Model ID
   */
  get applianceModelId() {
    return String(this._info.applianceModelId || '');
  }

  /**
   * Get appliance type
   * @returns {string} Appliance type
   */
  get applianceType() {
    return String(this._info.applianceTypeName || this._info.applianceType || '');
  }

  /**
   * Get MAC address
   * @returns {string} MAC address
   */
  get macAddress() {
    return String(this.info.macAddress || this.info.serialNumber || '');
  }

  /**
   * Get unique ID
   * @returns {string} Unique ID
   */
  get uniqueId() {
    const defaultMac = 'xx-xx-xx-xx-xx-xx';
    const importName = `${this.applianceType.toLowerCase()}_${this.applianceModelId}`;
    let result = this._checkNameZone('macAddress', false);
    result = result.replace(defaultMac, importName);
    return result;
  }

  /**
   * Get model name
   * @returns {string} Model name
   */
  get modelName() {
    return this._checkNameZone('modelName');
  }

  /**
   * Get brand
   * @returns {string} Brand
   */
  get brand() {
    const brand = this._checkNameZone('brand');
    if (!brand) return '';
    return brand[0].toUpperCase() + brand.slice(1);
  }

  /**
   * Get nickname
   * @returns {string} Nickname
   */
  get nickName() {
    const result = this._checkNameZone('nickName');
    
    if (!result || /^[xX1\s-]+$/.test(result)) {
      return this.modelName;
    }
    
    return result;
  }

  /**
   * Get appliance code
   * @returns {string} Code
   */
  get code() {
    const code = this.info.code || '';
    
    if (code) {
      return code;
    }

    const serialNumber = this.info.serialNumber || '';
    return serialNumber.length < 18 
      ? serialNumber.substring(0, 8) 
      : serialNumber.substring(0, 11);
  }

  /**
   * Get model ID
   * @returns {number} Model ID
   */
  get modelId() {
    return parseInt(this._info.applianceModelId || 0);
  }

  /**
   * Get appliance options
   * @returns {Object} Options
   */
  get options() {
    return { ...this._applianceModel.options };
  }

  /**
   * Get commands
   * @returns {Object} Commands
   */
  get commands() {
    return this._commands;
  }

  /**
   * Get attributes
   * @returns {Object} Attributes
   */
  get attributes() {
    return this._attributes;
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  get statistics() {
    return this._statistics;
  }

  /**
   * Get info
   * @returns {Object} Info
   */
  get info() {
    return this._info;
  }

  /**
   * Get additional data
   * @returns {Object} Additional data
   */
  get additionalData() {
    return this._additionalData;
  }

  /**
   * Get zone
   * @returns {number} Zone
   */
  get zone() {
    return this._zone;
  }

  /**
   * Get API instance
   * @returns {Object} API instance
   */
  get api() {
    if (!this._api) {
      throw new NoAuthenticationException('Missing hOn login');
    }
    return this._api;
  }

  /**
   * Load commands from API
   * @returns {Promise<void>}
   */
  async loadCommands() {
    const commandLoader = new HonCommandLoader(this.api, this);
    await commandLoader.loadCommands();
    this._commands = commandLoader.commands;
    this._additionalData = commandLoader.additionalData;
    this._applianceModel = commandLoader.applianceData;
    this.syncParamsToCommand('settings');
  }

  /**
   * Load attributes from API
   * @returns {Promise<void>}
   */
  async loadAttributes() {
    const attributes = await this.api.loadAttributes(this);
    const shadowParams = attributes.shadow?.parameters || {};
    
    // Update or create attributes
    for (const [name, values] of Object.entries(shadowParams)) {
      if (this._attributes.parameters && this._attributes.parameters[name]) {
        this._attributes.parameters[name].update(values);
      } else {
        if (!this._attributes.parameters) {
          this._attributes.parameters = {};
        }
        this._attributes.parameters[name] = new HonAttribute(values);
      }
    }

    delete attributes.shadow;
    Object.assign(this._attributes, attributes);

    // Apply extras if available
    if (this._extra && this._extra.attributes) {
      this._attributes = this._extra.attributes(this._attributes);
    }
  }

  /**
   * Load statistics from API
   * @returns {Promise<void>}
   */
  async loadStatistics() {
    const stats = await this.api.loadStatistics(this);
    const maintenance = await this.api.loadMaintenance(this);
    this._statistics = { ...stats, ...maintenance };
  }

  /**
   * Update appliance data
   * @param {boolean} force - Force update
   * @returns {Promise<void>}
   */
  async update(force = false) {
    const now = new Date();
    const minAge = new Date(now.getTime() - MINIMAL_UPDATE_INTERVAL * 1000);

    if (force || !this._lastUpdate || this._lastUpdate < minAge) {
      this._lastUpdate = now;
      await this.loadAttributes();
      this.syncParamsToCommand('settings');
    }
  }

  /**
   * Get command parameters
   * @returns {Object} Command parameters
   */
  get commandParameters() {
    const result = {};
    for (const [name, command] of Object.entries(this._commands)) {
      result[name] = command.parameterValue;
    }
    return result;
  }

  /**
   * Get settings
   * @returns {Object} Settings
   */
  get settings() {
    const result = {};
    
    for (const [name, command] of Object.entries(this._commands)) {
      for (const key of command.settingKeys) {
        const setting = command.settings[key] || this._defaultSetting;
        result[`${name}.${key}`] = setting;
      }
    }

    if (this._extra && this._extra.settings) {
      return this._extra.settings(result);
    }

    return result;
  }

  /**
   * Get available settings
   * @returns {Array<string>} Setting keys
   */
  get availableSettings() {
    const result = [];
    
    for (const [name, command] of Object.entries(this._commands)) {
      for (const key of command.settingKeys) {
        result.push(`${name}.${key}`);
      }
    }

    return result;
  }

  /**
   * Get all appliance data
   * @returns {Object} All data
   */
  get data() {
    return {
      attributes: this.attributes,
      appliance: this.info,
      statistics: this.statistics,
      additionalData: this._additionalData,
      ...this.commandParameters,
      ...this.attributes
    };
  }

  /**
   * Sync command to params
   * @param {string} commandName - Command name
   */
  syncCommandToParams(commandName) {
    const command = this.commands[commandName];
    
    if (!command) {
      return;
    }

    const params = this.attributes.parameters || {};
    
    for (const key of Object.keys(params)) {
      const newParam = command.parameters[key];
      
      if (newParam) {
        params[key].update(String(newParam.internValue), true);
      }
    }
  }

  /**
   * Sync params to command
   * @param {string} commandName - Command name
   */
  syncParamsToCommand(commandName) {
    const command = this.commands[commandName];
    
    if (!command) {
      return;
    }

    for (const key of command.settingKeys) {
      const newParam = this.attributes.parameters?.[key];
      
      if (!newParam || newParam.value === '') {
        continue;
      }

      const setting = command.settings[key];
      
      try {
        if (!(setting instanceof HonParameterRange)) {
          command.settings[key].value = String(newParam.value);
        } else {
          command.settings[key].value = parseFloat(newParam.value);
        }
      } catch (error) {
        console.log(`Can't set ${key} - ${error.message}`);
      }
    }
  }

  /**
   * Sync command parameters to other commands
   * @param {string} main - Main command name
   * @param {Array<string>|string} target - Target commands (optional)
   * @param {Array<string>|boolean} toSync - Parameters to sync (optional)
   */
  syncCommand(main, target = null, toSync = null) {
    const base = this.commands[main];
    
    if (!base) {
      return;
    }

    for (const [command, data] of Object.entries(this.commands)) {
      if (command === main || (target && !target.includes(command))) {
        continue;
      }

      for (const [name, targetParam] of Object.entries(data.parameters)) {
        const baseParam = base.parameters[name];
        
        if (!baseParam) {
          continue;
        }

        if (toSync) {
          if ((Array.isArray(toSync) && !toSync.includes(name)) || !baseParam.mandatory) {
            continue;
          }
        }

        this.syncParameter(baseParam, targetParam);
      }
    }
  }

  /**
   * Sync parameter values
   * @param {Object} main - Main parameter
   * @param {Object} target - Target parameter
   */
  syncParameter(main, target) {
    if (main instanceof HonParameterRange && target instanceof HonParameterRange) {
      target.max = main.max;
      target.min = main.min;
      target.step = main.step;
    } else if (target instanceof HonParameterRange) {
      const value = parseInt(main.value);
      target.max = value;
      target.min = value;
      target.step = 1;
    } else if (target instanceof HonParameterEnum) {
      target.values = main.values;
    }

    target.value = main.value;
  }

  /**
   * String representation
   * @returns {string} Appliance description
   */
  toString() {
    return `${this.brand} ${this.modelName}`;
  }
}

module.exports = HonAppliance;
