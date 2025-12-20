/**
 * HonCommandLoader - Loads and parses hOn command data
 * Ported from pyhOn command_loader.py
 */

const HonCommand = require('./command');
const { NoAuthenticationException } = require('../utils/exceptions');
const { HonParameterFixed, HonParameterProgram } = require('../parameters');

class HonCommandLoader {
  /**
   * @param {Object} api - API instance
   * @param {Object} appliance - Appliance instance
   */
  constructor(api, appliance) {
    this._api = api;
    this._appliance = appliance;
    this._apiCommands = {};
    this._favourites = [];
    this._commandHistory = [];
    this._commands = {};
    this._applianceData = {};
    this._additionalData = {};
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
   * Get appliance instance
   * @returns {Object} Appliance instance
   */
  get appliance() {
    return this._appliance;
  }

  /**
   * Get loaded commands
   * @returns {Object} Commands
   */
  get commands() {
    return this._commands;
  }

  /**
   * Get appliance data
   * @returns {Object} Appliance data
   */
  get applianceData() {
    return this._applianceData;
  }

  /**
   * Get additional data
   * @returns {Object} Additional data
   */
  get additionalData() {
    return this._additionalData;
  }

  /**
   * Load all command data
   * @returns {Promise<void>}
   */
  async loadCommands() {
    await this._loadData();
    this._applianceData = this._apiCommands.applianceModel || {};
    delete this._apiCommands.applianceModel;
    this._getCommands();
    this._addFavourites();
    this._recoverLastCommandStates();
  }

  /**
   * Load commands from API
   * @returns {Promise<void>}
   * @private
   */
  async _loadCommands() {
    this._apiCommands = await this._api.loadCommands(this._appliance);
  }

  /**
   * Load favourites from API
   * @returns {Promise<void>}
   * @private
   */
  async _loadFavourites() {
    this._favourites = await this._api.loadFavourites(this._appliance);
  }

  /**
   * Load command history from API
   * @returns {Promise<void>}
   * @private
   */
  async _loadCommandHistory() {
    this._commandHistory = await this._api.loadCommandHistory(this._appliance);
  }

  /**
   * Load all data in parallel
   * @returns {Promise<void>}
   * @private
   */
  async _loadData() {
    await Promise.all([
      this._loadCommands(),
      this._loadFavourites(),
      this._loadCommandHistory()
    ]);
  }

  /**
   * Check if data can be parsed as command
   * @param {Object} data - Data to check
   * @returns {boolean} True if is command
   * @private
   */
  static _isCommand(data) {
    return data.description !== undefined && data.protocolType !== undefined;
  }

  /**
   * Clean category name
   * @param {string} category - Category name
   * @returns {string} Cleaned name
   * @private
   */
  static _cleanName(category) {
    if (category.includes('PROGRAM')) {
      return category.split('.').pop().toLowerCase();
    }
    return category;
  }

  /**
   * Generate commands from API data
   * @private
   */
  _getCommands() {
    const commands = [];
    for (const [name, data] of Object.entries(this._apiCommands)) {
      const command = this._parseCommand(data, name);
      if (command) {
        commands.push(command);
      }
    }
    this._commands = {};
    for (const cmd of commands) {
      this._commands[cmd.name] = cmd;
    }
  }

  /**
   * Try to create HonCommand object
   * @param {Object|string} data - Command data
   * @param {string} commandName - Command name
   * @param {Object} categories - Command categories (optional)
   * @param {string} categoryName - Category name (optional)
   * @returns {HonCommand|null} Command or null
   * @private
   */
  _parseCommand(data, commandName, categories = null, categoryName = '') {
    if (typeof data !== 'object' || data === null) {
      this._additionalData[commandName] = data;
      return null;
    }

    if (HonCommandLoader._isCommand(data)) {
      return new HonCommand(
        commandName,
        data,
        this._appliance,
        categories,
        categoryName
      );
    }

    const category = this._parseCategories(data, commandName);
    if (category) {
      return category;
    }

    return null;
  }

  /**
   * Parse categories and create references
   * @param {Object} data - Category data
   * @param {string} commandName - Command name
   * @returns {HonCommand|null} Command or null
   * @private
   */
  _parseCategories(data, commandName) {
    const categories = {};
    
    for (const [category, value] of Object.entries(data)) {
      const command = this._parseCommand(
        value,
        commandName,
        categories,
        category
      );
      
      if (command) {
        categories[HonCommandLoader._cleanName(category)] = command;
      }
    }

    if (Object.keys(categories).length > 0) {
      // setParameters should be at first place
      if ('setParameters' in categories) {
        return categories.setParameters;
      }
      const values = Object.values(categories).filter(v => v !== undefined && v !== null);
      if (values.length > 0) {
        return values[0];
      }
    }

    return null;
  }

  /**
   * Get index of last command execution
   * @param {string} name - Command name
   * @returns {number|null} Index or null
   * @private
   */
  _getLastCommandIndex(name) {
    return this._commandHistory.findIndex(
      d => d.command?.commandName === name
    );
  }

  /**
   * Set category to last state
   * @param {HonCommand} command - Command
   * @param {string} name - Command name
   * @param {Object} parameters - Parameters
   * @returns {HonCommand} Updated command
   * @private
   */
  _setLastCategory(command, name, parameters) {
    if (command.categories) {
      const program = parameters.program;
      const category = parameters.category;
      
      delete parameters.program;
      delete parameters.category;

      if (program) {
        command.category = HonCommandLoader._cleanName(program);
      } else if (category) {
        command.category = category;
      } else {
        return command;
      }

      return this.commands[name];
    }
    return command;
  }

  /**
   * Set commands to last state
   * @private
   */
  _recoverLastCommandStates() {
    for (const [name, command] of Object.entries(this.commands)) {
      const lastIndex = this._getLastCommandIndex(name);
      
      if (lastIndex === -1 || lastIndex === null) {
        continue;
      }

      const lastCommand = this._commandHistory[lastIndex];
      const parameters = lastCommand.command?.parameters || {};
      const updatedCommand = this._setLastCategory(command, name, parameters);

      for (const [key, data] of Object.entries(updatedCommand.settings)) {
        if (parameters[key] === undefined) {
          continue;
        }

        try {
          data.value = parameters[key];
        } catch (error) {
          // Suppress ValueError
        }
      }
    }
  }

  /**
   * Patch program categories with favourites
   * @private
   */
  _addFavourites() {
    for (const favourite of this._favourites) {
      const [name, commandName, base] = this._getFavouriteInfo(favourite);
      
      if (!base) {
        continue;
      }

      // Create a shallow copy of the base command
      const baseCommand = Object.assign(
        Object.create(Object.getPrototypeOf(base)),
        base
      );

      this._updateBaseCommandWithData(baseCommand, favourite);
      this._updateBaseCommandWithFavourite(baseCommand);
      this._updateProgramCategories(commandName, name, baseCommand);
    }
  }

  /**
   * Get favourite info
   * @param {Object} favourite - Favourite data
   * @returns {Array} [name, commandName, baseCommand]
   * @private
   */
  _getFavouriteInfo(favourite) {
    const name = favourite.favouriteName || '';
    const command = favourite.command || {};
    const commandName = command.commandName || '';
    const programName = HonCommandLoader._cleanName(command.programName || '');
    const baseCommand = this.commands[commandName]?.categories?.[programName];
    
    return [name, commandName, baseCommand];
  }

  /**
   * Update base command with data
   * @param {HonCommand} baseCommand - Base command
   * @param {Object} command - Command data
   * @private
   */
  _updateBaseCommandWithData(baseCommand, command) {
    for (const data of Object.values(command)) {
      if (typeof data === 'string') {
        continue;
      }

      for (const [key, value] of Object.entries(data)) {
        const parameter = baseCommand.parameters[key];
        
        if (!parameter) {
          continue;
        }

        try {
          parameter.value = value;
        } catch (error) {
          // Suppress ValueError
        }
      }
    }
  }

  /**
   * Update base command with favourite marker
   * @param {HonCommand} baseCommand - Base command
   * @private
   */
  _updateBaseCommandWithFavourite(baseCommand) {
    const extraParam = new HonParameterFixed('favourite', { fixedValue: '1' }, 'custom');
    baseCommand.parameters.favourite = extraParam;
  }

  /**
   * Update program categories
   * @param {string} commandName - Command name
   * @param {string} name - Favourite name
   * @param {HonCommand} baseCommand - Base command
   * @private
   */
  _updateProgramCategories(commandName, name, baseCommand) {
    const program = baseCommand.parameters.program;
    
    if (program instanceof HonParameterProgram) {
      program.value = name;  // Use property setter, not setValue() method
    }

    this.commands[commandName].categories[name] = baseCommand;
  }
}

module.exports = HonCommandLoader;
