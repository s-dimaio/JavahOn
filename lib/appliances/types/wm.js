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
    '0': 'ready',     // Machine on in standby (shown as "Ready" in hOn app)
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
   * Complete mapping verified against hOn API translation keys
   * Maps to WASHING_CMD&CTRL.PHASE_* translation keys
   * @static
   */
  static WASH_PHASES = {
    '0': 'ready',            // Idle → PHASE_READY
    '1': 'prewash',          // Pre-Wash → PHASE_PREWASH
    '2': 'washing',          // Wash → PHASE_WASHING
    '3': 'rinse',            // Rinse → PHASE_RINSE
    '4': 'rinse',            // Rinse (alternative) → PHASE_RINSE
    '5': 'ending_program',   // End → PHASE_ENDING_PROGRAM
    '6': 'drying',           // Drying → PHASE_DRYING
    '7': 'error',            // Error → PHASE_ERROR
    '8': 'steam',            // Steam → PHASE_STEAM
    '9': 'gnpause',          // Good night pause → PHASE_GNPAUSE
    '10': 'spin',            // Spin (pre) → PHASE_SPIN
    '11': 'spin',            // Spin (main) → PHASE_SPIN
    '12': 'weighting',       // Weighting → PHASE_WEIGHTING
    '13': 'tumbling',        // Keep fresh → PHASE_TUMBLING
    '14': 'heating',         // Heating → PHASE_HEATING
    '15': 'refresh',         // Refresh → PHASE_REFRESH
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
   * @param {string|number} [machMode] - Optional machMode value. If not provided, reads from appliance
   * @returns {string} State key (e.g., 'ready', 'running', 'paused')
   */
  getStateKey(machMode) {
    if (machMode === undefined) {
      machMode = this.parent.attributes?.parameters?.machMode?.value;
    }
    return WashingMachine.MACHINE_STATES[String(machMode)] || 'unknown';
  }

  /**
   * Get current wash phase as a normalized key
   * @param {string|number} [prPhase] - Optional prPhase value. If not provided, reads from appliance
   * @returns {string} Phase key (e.g., 'wash', 'rinse', 'spin')
   */
  getWashPhaseKey(prPhase) {
    if (prPhase === undefined) {
      prPhase = this.parent.attributes?.parameters?.prPhase?.value;
    }
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
   * Get translation key for program ID
   * Maps program IDs to hOn API translation key format
   * @param {string} programId - Program ID (e.g., 'rapid_14_min', 'cottons')
   * @returns {string|null} Translation key or null if invalid
   * @example
   * const key = wm.getProgramTranslationKey('rapid_14_min');
   * // Returns: 'PROGRAMS.WM_WD_PROGRAM_NAME_RAPID_14'
   */
  getProgramTranslationKey(programId) {
    if (!programId) return null;

    let normalizedId = programId.toUpperCase().replace(/_MIN$/, '');
    
    if (normalizedId.startsWith('IOT_WASH_')) {
      return `PROGRAMS.WM_WD_PROGRAM_IOT_WASH_NAME_${normalizedId.replace('IOT_WASH_', '')}`;
    }
    else if (normalizedId.startsWith('IOT_DRY_')) {
      return `PROGRAMS.WM_WD_PROGRAM_IOT_DRY_NAME_${normalizedId.replace('IOT_DRY_', '')}`;
    }
    else {
      return `PROGRAMS.WM_WD_PROGRAM_NAME_${normalizedId}`;
    }
  }

  /**
   * Get localized program name
   * Uses provided translation function to get localized name from hOn API
   * Falls back to formatted program name if translation not available
   * @param {string} programId - Program ID from API
   * @param {Function} translateFn - Translation function (key => translated text)
   * @returns {string} Localized program name or formatted fallback
   * @example
   * const name = wm.getLocalizedProgramName('rapid_14_min', (key) => translations[key]);
   * // Returns: "Rapido 14'" (if translated) or "Rapid 14 Min" (fallback)
   */
  getLocalizedProgramName(programId, translateFn) {
    if (!programId) return '';

    const key = this.getProgramTranslationKey(programId);
    if (key && translateFn) {
      const translated = translateFn(key);
      if (translated && translated !== key) return translated;
    }
    
    if (this.parent.commands?.startProgram?.programs?.[programId]?.name) {
      return this.parent.commands.startProgram.programs[programId].name;
    }
    
    const HonParameterProgram = require('../../parameters/program');
    return HonParameterProgram.formatProgramName(programId);
  }

  /**
   * Get translation key for machine state
   * Maps machMode and prPhase to hOn API translation key
   * @param {number} machMode - Machine mode (0-7)
   * @param {number} prPhase - Program phase
   * @returns {string} Translation key
   * @example
   * const key = wm.getStateTranslationKey(2, 11);
   * // Returns: 'WASHING_CMD&CTRL.PHASE_SPIN.TITLE'
   */
  getStateTranslationKey(machMode, prPhase) {
    const machModeMap = {
      0: 'READY', 1: 'READY', 2: 'RUNNING', 3: 'PAUSE',
      4: 'SCHEDULED', 5: 'READY', 6: 'ERROR', 7: 'READY'
    };

    if (machMode === 2 && prPhase !== undefined && prPhase !== 0) {
      const phaseKey = this.getWashPhaseKey(prPhase);
      if (phaseKey) {
        return `WASHING_CMD&CTRL.PHASE_${phaseKey.toUpperCase()}.TITLE`;
      }
    }

    const stateKey = machModeMap[machMode] || 'READY';
    return `GLOBALS.APPLIANCE_STATUS.${stateKey}`;
  }

  /**
   * Get localized state text
   * Uses provided translation function to get localized state from hOn API
   * Falls back to formatted phase key if translation not available
   * @param {number} machMode - Machine mode
   * @param {number} prPhase - Program phase
   * @param {Function} translateFn - Translation function (key => translated text)
   * @returns {string} Localized state text
   * @example
   * const state = wm.getLocalizedState(2, 11, (key) => translations[key]);
   * // Returns: "Centrifuga" (if translated) or "Spin" (fallback)
   */
  getLocalizedState(machMode, prPhase, translateFn) {
    const key = this.getStateTranslationKey(machMode, prPhase);
    if (key && translateFn) {
      const translated = translateFn(key);
      if (translated && translated !== key) return translated;
    }
    
    const phaseKey = this.getWashPhaseKey(prPhase);
    if (phaseKey) {
      return phaseKey.charAt(0).toUpperCase() + phaseKey.slice(1);
    }
    
    return 'Ready';
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
