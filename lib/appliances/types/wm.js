/**
 * Washing Machine Appliance
 * Ported from pyhOn appliances/wm.py
 */

const ApplianceBase = require('./base');

class WashingMachine extends ApplianceBase {
  /**
   * Machine state mapping (machMode values)
   * @static
   */
  static MACHINE_STATES = {
    '0': 'idle',      // Off/Standby
    '1': 'ready',     // Ready (machine on and ready for commands)
    '2': 'running',   // Running program
    '3': 'paused',    // Paused
    '4': 'scheduled', // Delayed start - waiting to start
    '5': 'finished',  // Program finished
    '6': 'error',     // Error state
    '7': 'finished',  // Test/Standby (treated as finished)
  };

  /**
   * Wash phase mapping (prPhase values)
   * @static
   */
  static WASH_PHASES = {
    '0': 'idle',      // Idle
    '1': 'prewash',   // Pre-Wash
    '2': 'wash',      // Wash
    '3': 'rinse',     // Rinse
    '4': 'rinse',     // Rinse (alternative)
    '5': 'drying',    // Dry
    '6': 'rinse',     // Rinse (steam)
    '7': 'ending',    // Ending/Finished
    '8': 'wash',      // Weighing (part of wash cycle)
    '11': 'spin',     // Spin phase (centrifuga)
  };

  /**
   * Process attributes for washing machine
   * @param {Object} data - Attributes data
   * @returns {Object} Processed attributes
   */
  attributes(data) {
    // Call base attributes to add programName
    data = super.attributes(data);
    
    // Handle disconnected state
    if (data.lastConnEvent && data.lastConnEvent.category === 'DISCONNECTED') {
      if (data.parameters && data.parameters.machMode) {
        data.parameters.machMode.value = '0';
      }
    }
    
    // Add active state
    data.active = Boolean(data.activity);
    
    // Add pause state
    data.pause = data.parameters?.machMode?.value === '3';
    
    return data;
  }

  /**
   * Process settings for washing machine
   * @param {Object} settings - Settings data
   * @returns {Object} Processed settings
   */
  settings(settings) {
    return settings;
  }

  /**
   * Get current machine state as a normalized key
   * @returns {string} State key (e.g., 'idle', 'running', 'paused')
   */
  getStateKey() {
    const machMode = this.parent.attributes?.parameters?.machMode?.value;
    return WashingMachine.MACHINE_STATES[String(machMode)] || 'unknown';
  }

  /**
   * Get current wash phase as a normalized key
   * @returns {string} Phase key (e.g., 'wash', 'rinse', 'spin')
   */
  getWashPhaseKey() {
    const prPhase = this.parent.attributes?.parameters?.prPhase?.value;
    return WashingMachine.WASH_PHASES[String(prPhase)] || 'idle';
  }

  /**
   * Get display name for current state (fallback if translation not available)
   * @returns {string} Display name
   */
  getStateDisplay() {
    const key = this.getStateKey();
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  /**
   * Get display name for current wash phase (fallback if translation not available)
   * @returns {string} Display name
   */
  getWashPhaseDisplay() {
    const key = this.getWashPhaseKey();
    return key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
  }

  /**
   * Get available programs with filtering
   * Excludes iot_*, programs without prCode, and favourites
   * @returns {Array<Object>} Array of program objects with id, name, prCode, prPosition
   */
  getAvailablePrograms() {
    const startCmd = this.parent.commands?.startProgram;
    if (!startCmd || !startCmd.categories) return [];

    const HonParameterProgram = require('../../parameters/program');
    const programs = [];

    for (const [name, category] of Object.entries(startCmd.categories)) {
      // Skip iot programs
      if (name.startsWith('iot_')) continue;

      // Get prCode
      const prCode = category.parameters?.prCode?.value;
      if (prCode === undefined || prCode === null) continue;

      // Skip favourites
      const favourite = category.parameters?.favourite?.value;
      if (favourite && String(favourite) === '1') continue;

      // Get prPosition if available
      const prPosition = category.parameters?.prPosition?.value;

      programs.push({
        id: name,
        name: HonParameterProgram.formatProgramName(name),
        prCode: parseInt(prCode),
        prPosition: prPosition !== undefined ? parseInt(prPosition) : null
      });
    }

    return programs.sort((a, b) => a.prCode - b.prCode);
  }

  /**
   * Get available temperatures for current program
   * @returns {Array<number>} Array of temperature values in °C
   */
  getAvailableTemperatures() {
    return this._getParameterValues('temp');
  }

  /**
   * Get available spin speeds for current program
   * @returns {Array<number>} Array of spin speed values in RPM
   */
  getAvailableSpinSpeeds() {
    return this._getParameterValues('spinSpeed');
  }

  /**
   * Get values for a parameter (handles both Enum and Range types)
   * @param {string} paramName - Parameter name
   * @returns {Array<number>} Array of numeric values
   * @private
   */
  _getParameterValues(paramName) {
    const param = this.parent.commands?.startProgram?.parameters?.[paramName];
    if (!param) return [];

    const values = param.values || [];
    return values
      .map(v => parseInt(v))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b);
  }

  /**
   * Find program by prCode and prPosition
   * @param {number} prCode - Program code
   * @param {number|null} prPosition - Program position (optional)
   * @returns {Object|null} Program object or null if not found
   */
  findProgramByCode(prCode, prPosition = null) {
    const startCmd = this.parent.commands?.startProgram;
    if (!startCmd?.categories) return null;

    const HonParameterProgram = require('../../parameters/program');
    const searchPrCode = String(prCode);
    const searchPrPosition = prPosition !== null ? String(prPosition) : null;

    for (const [key, category] of Object.entries(startCmd.categories)) {
      const catPrCode = category.parameters?.prCode?.value;
      const catPrPosition = category.parameters?.prPosition?.value;

      // Match by prCode and prPosition (if provided)
      if (catPrCode === searchPrCode) {
        if (searchPrPosition === null || catPrPosition === searchPrPosition) {
          return {
            id: key,
            name: HonParameterProgram.formatProgramName(key),
            prCode: parseInt(prCode),
            prPosition: prPosition
          };
        }
      }
    }

    return null;
  }

  /**
   * Get current program information
   * @returns {Object|null} Program info or null if no program running
   */
  getProgramInfo() {
    const prCode = this.parent.attributes?.parameters?.prCode?.value;
    const prPosition = this.parent.attributes?.parameters?.prPosition?.value;

    if (!prCode || prCode === '0') return null;

    return this.findProgramByCode(parseInt(prCode), prPosition ? parseInt(prPosition) : null);
  }

  /**
   * Check if remote control is enabled on the appliance
   * @returns {boolean} True if remote control is enabled
   */
  isRemoteControlEnabled() {
    const remoteCtrValid = this.parent.attributes?.parameters?.remoteCtrValid?.value;
    if (remoteCtrValid === undefined || remoteCtrValid === null) {
      // If parameter doesn't exist, assume remote control is available
      return true;
    }
    return parseInt(remoteCtrValid) === 1;
  }

  /**
   * Validate that remote control is enabled, throw error if not
   * @param {string} commandName - Name of the command being validated (for error message)
   * @throws {Error} If remote control is not enabled
   */
  validateRemoteControl(commandName = 'command') {
    if (!this.isRemoteControlEnabled()) {
      throw new Error(`Cannot execute ${commandName}: Remote control is not enabled on the appliance. Please enable it on the machine display.`);
    }
  }
}

module.exports = WashingMachine;
