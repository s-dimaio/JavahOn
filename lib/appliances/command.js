/**
 * HonCommand - Appliance command with parameters
 * Ported from pyhOn commands.py
 */

const { 
  HonParameter, 
  HonParameterFixed, 
  HonParameterEnum, 
  HonParameterRange,
  HonParameterProgram 
} = require('../parameters');
const { NoAuthenticationException, ApiError } = require('../utils/exceptions');

class HonCommand {
  /**
   * @param {string} name - Command name
   * @param {Object} attributes - Command attributes
   * @param {Object} appliance - Parent appliance
   * @param {Object} categories - Command categories (optional)
   * @param {string} categoryName - Category name (optional)
   */
  constructor(name, attributes, appliance, categories = null, categoryName = '') {
    this._name = name;
    this._api = null;
    this._appliance = appliance;
    this._categories = categories;
    this._categoryName = categoryName;
    this._parameters = {};
    this._data = {};
    this._rules = [];
    
    // Remove unused attributes
    delete attributes.description;
    delete attributes.protocolType;
    
    this._loadParameters(attributes);
  }

  /**
   * Get command name
   * @returns {string} Command name
   */
  get name() {
    return this._name;
  }

  /**
   * Get API instance
   * @returns {Object} API instance
   */
  get api() {
    if (!this._api && this._appliance) {
      this._api = this._appliance.api;
    }
    if (!this._api) {
      throw new NoAuthenticationException('Missing hOn login');
    }
    return this._api;
  }

  /**
   * Get parent appliance
   * @returns {Object} Appliance
   */
  get appliance() {
    return this._appliance;
  }

  /**
   * Get command data
   * @returns {Object} Data
   */
  get data() {
    return this._data;
  }

  /**
   * Get command parameters
   * @returns {Object} Parameters
   */
  get parameters() {
    return this._parameters;
  }

  /**
   * Get command settings (alias for parameters)
   * @returns {Object} Settings
   */
  get settings() {
    return this._parameters;
  }

  /**
   * Get parameter groups
   * @returns {Object} Grouped parameters
   */
  get parameterGroups() {
    const result = {};
    for (const [name, parameter] of Object.entries(this._parameters)) {
      if (!result[parameter.group]) {
        result[parameter.group] = {};
      }
      result[parameter.group][name] = parameter.internValue;
    }
    return result;
  }

  /**
   * Get mandatory parameter groups
   * @returns {Object} Mandatory grouped parameters
   */
  get mandatoryParameterGroups() {
    const result = {};
    for (const [name, parameter] of Object.entries(this._parameters)) {
      if (parameter.mandatory) {
        if (!result[parameter.group]) {
          result[parameter.group] = {};
        }
        result[parameter.group][name] = parameter.internValue;
      }
    }
    return result;
  }

  /**
   * Get parameter values
   * @returns {Object} Parameter values
   */
  get parameterValue() {
    const result = {};
    for (const [name, param] of Object.entries(this._parameters)) {
      result[name] = param.value;
    }
    return result;
  }

  /**
   * Load parameters from attributes
   * @param {Object} attributes - Command attributes
   * @private
   */
  _loadParameters(attributes) {
    for (const [key, items] of Object.entries(attributes)) {
      if (typeof items !== 'object' || items === null) {
        console.log(`Loading Attributes - Skipping ${items}`);
        continue;
      }
      
      for (const [name, data] of Object.entries(items)) {
        this._createParameters(data, name, key);
      }
    }
    
    // Apply rules
    for (const rule of this._rules) {
      if (rule.patch) {
        rule.patch();
      }
    }
  }

  /**
   * Create parameter based on type
   * @param {Object} data - Parameter data
   * @param {string} name - Parameter name
   * @param {string} parameterGroup - Parameter group
   * @private
   */
  _createParameters(data, name, parameterGroup) {
    // Handle zoneMap for zones
    if (name === 'zoneMap' && this._appliance.zone) {
      data.default = this._appliance.zone;
    }

    // Handle rules
    if (data.category === 'rule') {
      // Rules will be implemented later
      console.log('Rule handling not yet implemented');
      return;
    }

    // Create parameter based on typology
    const typology = data.typology;
    
    switch (typology) {
      case 'range':
        this._parameters[name] = new HonParameterRange(name, data, parameterGroup);
        break;
      case 'enum':
        this._parameters[name] = new HonParameterEnum(name, data, parameterGroup);
        break;
      case 'fixed':
        this._parameters[name] = new HonParameterFixed(name, data, parameterGroup);
        break;
      default:
        this._data[name] = data;
        return;
    }

    // Add program parameter if category name contains PROGRAM
    if (this._categoryName) {
      const paramName = this._categoryName.includes('PROGRAM') ? 'program' : 'category';
      this._parameters[paramName] = new HonParameterProgram(paramName, this, 'custom');
    }
  }

  /**
   * Send command with parameters
   * @param {boolean} onlyMandatory - Send only mandatory parameters
   * @returns {Promise<boolean>} Success status
   */
  async send(onlyMandatory = false) {
    const groupedParams = onlyMandatory 
      ? this.mandatoryParameterGroups 
      : this.parameterGroups;
    const params = groupedParams.parameters || {};
    return await this.sendParameters(params);
  }

  /**
   * Send specific parameters
   * @param {Array<string>} paramNames - Parameter names to send
   * @returns {Promise<boolean>} Success status
   */
  async sendSpecific(paramNames) {
    const params = {};
    for (const [key, parameter] of Object.entries(this._parameters)) {
      if (paramNames.includes(key) || parameter.mandatory) {
        params[key] = parameter.value;
      }
    }
    return await this.sendParameters(params);
  }

  /**
   * Send command with specific parameters
   * @param {Object} params - Parameters to send
   * @returns {Promise<boolean>} Success status
   */
  async sendParameters(params) {
    const ancillaryParams = { ...this.parameterGroups.ancillaryParameters };
    delete ancillaryParams.programRules;
    
    if ('prStr' in params) {
      params.prStr = this._categoryName.toUpperCase();
    }

    // Sync command to appliance params
    if (this.appliance.syncCommandToParams) {
      this.appliance.syncCommandToParams(this.name);
    }

    try {
      const result = await this.api.sendCommand(
        this._appliance,
        this._name,
        params,
        ancillaryParams,
        this._categoryName
      );
      
      if (!result) {
        console.error('Command send failed:', result);
        throw new ApiError("Can't send command");
      }
      
      return result;
    } catch (error) {
      if (error instanceof NoAuthenticationException) {
        console.error('No Authentication');
        return false;
      }
      throw error;
    }
  }

  /**
   * Get command categories
   * @returns {Object} Categories
   */
  get categories() {
    return this._categories || { '_': this };
  }

  /**
   * Get category name
   * @returns {string} Category name
   */
  get category() {
    return this._categoryName;
  }

  /**
   * Set category name
   * @param {string} category - New category
   */
  set category(category) {
    if (category in this.categories) {
      this._appliance.commands[this._name] = this.categories[category];
    }
  }

  /**
   * Get all setting keys from all categories
   * @returns {Array<string>} Setting keys
   */
  get settingKeys() {
    const keys = new Set();
    for (const cmd of Object.values(this.categories)) {
      for (const param of Object.keys(cmd.parameters)) {
        keys.add(param);
      }
    }
    return Array.from(keys);
  }

  /**
   * Get available settings across all categories
   * @returns {Object} Available settings
   */
  get availableSettings() {
    const result = {};
    
    for (const command of Object.values(this.categories)) {
      for (const [name, parameter] of Object.entries(command.parameters)) {
        if (name in result) {
          result[name] = this._moreOptions(result[name], parameter);
        } else {
          result[name] = parameter;
        }
      }
    }
    
    return result;
  }

  /**
   * Select parameter with more options
   * @param {Object} first - First parameter
   * @param {Object} second - Second parameter
   * @returns {Object} Parameter with more options
   * @private
   */
  _moreOptions(first, second) {
    if (first instanceof HonParameterFixed && !(second instanceof HonParameterFixed)) {
      return second;
    }
    if (second.values.length > first.values.length) {
      return second;
    }
    return first;
  }

  /**
   * String representation
   * @returns {string} Command description
   */
  toString() {
    return `${this._name} command`;
  }
}

module.exports = HonCommand;
