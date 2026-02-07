/**
 * Washing Machine Appliance
 * Ported from pyhOn appliances/wm.py
 * Extends ApplianceBase for attribute processing
 * Uses EventEmitter composition for real-time state change events
 */

const ApplianceBase = require('./base');
const EventEmitter = require('events');

class WashingMachine extends ApplianceBase {
  constructor(appliance, translations = {}) {
    super(appliance);
    // Use composition for EventEmitter functionality
    this._emitter = new EventEmitter();
    this._previousMachMode = null;
    this._previousPrPhase = null;
    this._translations = translations;
  }

  /**
   * Set translations dictionary
   * @param {Object} translations - Translations object from hOn API
   * @returns {void}
   * @example
   * wm.setTranslations(translationsFromAPI);
   */
  setTranslations(translations) {
    this._translations = translations || {};
  }

  /**
   * Get translation for a key
   * Supports nested keys with dot notation
   * @param {string} key - Translation key (e.g., 'PROGRAMS.WM_WD.COTTONS')
   * @returns {string} Translated text or key as fallback
   * @example
   * const translated = wm.getTranslation('PROGRAMS.WM_WD.COTTONS');
   * // Returns: "Cotone" (if translated) or key itself (fallback)
   */
  getTranslation(key) {
    if (!key || !this._translations) return key;

    const parts = key.split('.');
    let result = this._translations;

    for (const part of parts) {
      if (result && typeof result === 'object' && part in result) {
        result = result[part];
      } else {
        return key; // Not found
      }
    }

    return typeof result === 'string' ? result : key;
  }

  // EventEmitter delegation methods
  on(event, listener) { return this._emitter.on(event, listener); }
  once(event, listener) { return this._emitter.once(event, listener); }
  off(event, listener) { return this._emitter.off(event, listener); }
  removeListener(event, listener) { return this._emitter.removeListener(event, listener); }
  removeAllListeners(event) { return this._emitter.removeAllListeners(event); }
  emit(event, ...args) { return this._emitter.emit(event, ...args); }
  listenerCount(event) { return this._emitter.listenerCount(event); }

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
   * Complete mapping verified against Home Assistant implementation
   * Based on extensive device testing - see https://github.com/Andre0512/hon
   * Maps to WASHING_CMD&CTRL.PHASE_* translation keys
   * @static
   */
  static WASH_PHASES = {
    '0': 'ready',            // Ready/Idle
    '1': 'prewashing',       // Pre-wash
    '2': 'washing',          // Washing
    '3': 'rinse',            // Rinse 1
    '4': 'rinse',            // Rinse 2
    '5': 'rinse',            // Rinse 3
    '6': 'drain',            // Drain 
    '7': 'spin',             // Spin 1
    '8': 'drain',            // Drain 2
    '9': 'spin',             // Spin 2
    '10': 'spin',            // Spin 3
    '11': 'spin',            // Spin 4 (main spin)
    '12': 'rinse',           // Rinse 4
    '13': 'rinse',           // Rinse 5
    '14': 'spin',            // Spin 5
    '15': 'spin',            // Spin 6
    '16': 'anti_crease',     // Anti-crease / Keep fresh 1
    '17': 'anti_crease',     // Anti-crease / Keep fresh 2
    '18': 'tumbling',        // Tumbling / Drum rotation
    '19': 'steam',           // Steam 1
    '20': 'steam',           // Steam 2
    '255': 'ready',          // Ready (end state)
  };

  /**
   * Update machine state and emit events based on state transitions
   * Call this method when receiving MQTT parameter updates
   * 
   * Emits the following events:
   * - 'programStarted': When machMode transitions to 2 (running)
   * - 'programFinished': When machMode transitions from 2 to another state
   * - 'phaseChanged': When prPhase changes during program execution
   * - 'stateChanged': When machMode changes (any transition)
   * 
   * @param {Object} params - Parameter updates from MQTT/API
   * @param {Object} [params.machMode] - Machine mode parameter {value: string}
   * @param {Object} [params.prPhase] - Program phase parameter {value: string}
   * @param {Object} [params.prStr] - Program string parameter {value: string}
   * @returns {void}
   * @fires WashingMachine#programStarted
   * @fires WashingMachine#programFinished
   * @fires WashingMachine#phaseChanged
   * @fires WashingMachine#stateChanged
   * @example
   * wm.on('programStarted', (event) => {
   *   console.log('Program started:', event.program);
   * });
   * 
   * wm.updateState({
   *   machMode: { value: '2' },
   *   prPhase: { value: '2' },
   *   prStr: { value: 'cottons' }
   * });
   */
  updateState(params) {
    if (!params) return;

    // Extract machMode - handle both HonParameter objects {value: 'x'} and simple values
    // If not provided in params, preserve previous value to maintain state consistency
    let machMode = this._previousMachMode; // Default to previous
    if (params.machMode !== undefined) {
      const rawMode = typeof params.machMode === 'object' && params.machMode.value !== undefined
        ? params.machMode.value
        : params.machMode;
      machMode = rawMode !== null && rawMode !== undefined ? parseInt(rawMode) : this._previousMachMode;
    }

    // Extract prPhase - handle both HonParameter objects {value: 'x'} and simple values
    // If not provided in params, preserve previous value to maintain state consistency
    let prPhase = this._previousPrPhase; // Default to previous
    if (params.prPhase !== undefined) {
      const rawPhase = typeof params.prPhase === 'object' && params.prPhase.value !== undefined
        ? params.prPhase.value
        : params.prPhase;
      prPhase = rawPhase !== null && rawPhase !== undefined ? parseInt(rawPhase) : this._previousPrPhase;
    }

    // Extract program identifier
    const program = (typeof params.prStr === 'object' ? params.prStr?.value : params.prStr)
      || (typeof params.prCode === 'object' ? params.prCode?.value : params.prCode)
      || null;

    const eventData = {
      machMode,
      prPhase,
      program,
      timestamp: Date.now()
    };

    // Debug: Log state transition information
    console.log(`[WM Event] updateState called: prevMode=${this._previousMachMode}, newMode=${machMode}, prevPhase=${this._previousPrPhase}, newPhase=${prPhase}`);

    // Program started (transition to running state)
    if (this._previousMachMode !== 2 && machMode === 2) {
      console.log('[WM Event] 🎯 Emitting programStarted event');
      /**
       * Program started event
       * @event WashingMachine#programStarted
       * @type {Object}
       * @property {number} machMode - Current machine mode (2 = running)
       * @property {number|null} prPhase - Current program phase
       * @property {string|null} program - Program identifier
       * @property {number} timestamp - Unix timestamp in milliseconds
       */
      this.emit('programStarted', { ...eventData });
    }

    // Program finished (transition from running to another state)
    if (this._previousMachMode === 2 && machMode !== 2 && machMode !== null) {
      console.log('[WM Event] 🏁 Emitting programFinished event');
      /**
       * Program finished event
       * @event WashingMachine#programFinished
       * @type {Object}
       * @property {number} machMode - New machine mode after finish
       * @property {number|null} prPhase - Final program phase
       * @property {string|null} program - Program identifier
       * @property {number} timestamp - Unix timestamp in milliseconds
       */
      this.emit('programFinished', { ...eventData });
    }

    // Phase changed (during program execution)
    if (this._previousPrPhase !== null &&
      prPhase !== null &&
      this._previousPrPhase !== prPhase &&
      machMode === 2) {
      /**
       * Phase changed event
       * @event WashingMachine#phaseChanged
       * @type {Object}
       * @property {number} from - Previous phase number
       * @property {number} to - New phase number
       * @property {string|null} fromKey - Previous phase key (e.g., 'washing')
       * @property {string|null} toKey - New phase key (e.g., 'rinse')
       * @property {string|null} program - Program identifier
       * @property {number} timestamp - Unix timestamp in milliseconds
       */
      this.emit('phaseChanged', {
        from: this._previousPrPhase,
        to: prPhase,
        fromKey: this.getWashPhaseKey(this._previousPrPhase),
        toKey: this.getWashPhaseKey(prPhase),
        program,
        timestamp: eventData.timestamp
      });
    }

    // State changed (any machMode transition)
    if (this._previousMachMode !== null &&
      machMode !== null &&
      this._previousMachMode !== machMode) {
      /**
       * State changed event
       * @event WashingMachine#stateChanged
       * @type {Object}
       * @property {number} from - Previous machine mode
       * @property {number} to - New machine mode
       * @property {string|null} fromKey - Previous state key (e.g., 'ready')
       * @property {string|null} toKey - New state key (e.g., 'running')
       * @property {number|null} prPhase - Current program phase
       * @property {number} timestamp - Unix timestamp in milliseconds
       */
      this.emit('stateChanged', {
        from: this._previousMachMode,
        to: machMode,
        fromKey: this.getStateKey(this._previousMachMode),
        toKey: this.getStateKey(machMode),
        prPhase,
        timestamp: eventData.timestamp
      });
    }

    // Update previous state
    if (machMode !== null) this._previousMachMode = machMode;
    if (prPhase !== null) this._previousPrPhase = prPhase;
  }

  /**
   * Update appliance data from MQTT payload and trigger state events
   * Overrides base class to add washing machine specific event handling
   * @param {Object} payload - MQTT message payload
   * @param {Object} payload.parameters - Key-value pairs of appliance parameters
   * @returns {void}
   * @example
   * // Called automatically by MQTTClient when message received
   * washingMachine.updateFromMQTT({
   *   parameters: { machMode: '2', prPhase: '4', remainingTimeMM: 45 }
   * });
   */
  updateFromMQTT(payload) {
    // First, update internal attributes using parent class logic
    super.updateFromMQTT(payload);

    // Then, trigger state change events if machMode or prPhase changed
    if (payload && payload.parameters) {
      const params = payload.parameters;

      // Only call updateState if machMode or prPhase changed
      // MQTT sends only changed parameters, so we avoid unnecessary processing
      if (params.machMode !== undefined || params.prPhase !== undefined) {
        this.updateState(params);
      }
    }
  }


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
   * Get available programs with filtering
   * Excludes programs without prCode and custom favourites (user-created duplicates)
   * Uses internal translations if available
   * @returns {Array<Object>} Array of program objects with id, name, prCode, prPosition, temp, spinSpeed
   */
  getAvailablePrograms() {
    const startCmd = this.parent.commands?.startProgram;
    if (!startCmd || !startCmd.categories) return [];

    const programs = [];
    const seenPrograms = new Map(); // Track by prCode to detect duplicates

    for (const [name, category] of Object.entries(startCmd.categories)) {
      // Get prCode
      const prCode = category.parameters?.prCode?.value;
      if (prCode === undefined || prCode === null) continue;

      const prPosition = category.parameters?.prPosition?.value;
      const favourite = category.parameters?.favourite?.value;
      const translationKey = category._categoryName;

      // Identify custom favourites using multiple criteria:
      // Custom favourites are user-created duplicates of original programs
      const isCustomFavourite = (
        favourite && String(favourite) === '1' &&
        (
          // 1. Has spaces, uppercase, or special characters (user-modified name)
          /[A-Z\s'\"°]/.test(name) ||
          // 2. Missing translation key (custom programs don't have API keys)
          !translationKey ||
          // 3. Is duplicate of existing program with same prCode
          seenPrograms.has(prCode)
        )
      );

      if (isCustomFavourite) {
        continue; // Skip custom favourite
      }

      // Track this program
      seenPrograms.set(prCode, true);

      // Get localized name using translation key from API
      const displayName = this.getLocalizedProgramName(name, translationKey);

      // Get temperature and spin speed for this program
      const temp = category.parameters?.temp?.value;
      const spinSpeed = category.parameters?.spinSpeed?.value;

      programs.push({
        id: name,
        name: displayName,
        prCode: parseInt(prCode),
        prPosition: prPosition !== undefined ? parseInt(prPosition) : null,
        temp: temp !== undefined ? parseInt(temp) : null,
        spinSpeed: spinSpeed !== undefined ? parseInt(spinSpeed) : null
      });
    }

    // Sort by display name (case-insensitive alphabetical order)
    return programs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
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
   * Get localized program name
   * Uses translation key provided by API, falls back to formatted name if not available
   * @param {string|null} programId - Program ID from API (can be null if translationKey is provided)
   * @param {string} [translationKey] - Translation key from API (program._category)
   * @returns {string} Localized program name or formatted fallback
   * @example
   * const name = wm.getLocalizedProgramName('rapid_14_min', 'PROGRAMS.WM_WD.RAPID_14_MIN');
   * // Returns: "Rapido 14'" (if translated) or "Rapid 14 Min" (fallback)
   * @example
   * const name = wm.getLocalizedProgramName(null, 'PROGRAMS.WM_WD.COTTONS');
   * // Returns: "Cotone" (if translated) or empty string (fallback)
   */
  getLocalizedProgramName(programId, translationKey = null) {
    // Try translation using key provided by API first
    if (translationKey) {
      const translated = this.getTranslation(translationKey);
      if (translated && translated !== translationKey) return translated;
    }

    // If no programId, we can't proceed with fallbacks
    if (!programId) return '';

    // Fallback to program name in commands if available
    if (this.parent.commands?.startProgram?.programs?.[programId]?.name) {
      return this.parent.commands.startProgram.programs[programId].name;
    }

    // Final fallback: format program ID
    const HonParameterProgram = require('../../parameters/program');
    return HonParameterProgram.formatProgramName(programId);
  }

  /**
   * Get translation key for machine state
   * Maps machMode and prPhase to hOn API translation key
   * Uses WASH_PHASES as source of truth - simply converts phase key to uppercase
   * @param {number} machMode - Machine mode (0-7)
   * @param {number} prPhase - Program phase
   * @returns {string} Translation key
   * @example
   * const key = wm.getStateTranslationKey(2, 11);
   * // Returns: 'GLOBALS.APPLIANCE_STATUS.SPIN'
   */
  getStateTranslationKey(machMode, prPhase) {
    // If machine is running (machMode === 2), use phase-based translation
    if (machMode === 2 && prPhase !== undefined && prPhase !== 0 && prPhase !== 255) {
      const phaseKey = this.getWashPhaseKey(prPhase);

      if (phaseKey && phaseKey !== 'ready') {
        // Simply convert WASH_PHASES key to uppercase
        // Examples: 'washing' → 'WASHING', 'spin' → 'SPIN', 'rinse' → 'RINSE'
        const translationKey = phaseKey.toUpperCase();
        return `GLOBALS.APPLIANCE_STATUS.${translationKey}`;
      }
    }

    // For non-running states, map machMode directly
    const machModeMap = {
      0: 'READY',        // Idle
      1: 'READY',        // Ready
      2: 'RUNNING',      // Running (if no phase detected)
      3: 'PAUSE',        // Paused
      4: 'SCHEDULED',    // Scheduled
      5: 'READY',        // Finished
      6: 'ERROR',        // Error
      7: 'READY'         // Test mode
    };

    const stateKey = machModeMap[machMode] || 'READY';
    return `GLOBALS.APPLIANCE_STATUS.${stateKey}`;
  }

  /**
   * Get localized state text
   * Uses internal translations to get localized state from hOn API
   * Falls back to formatted phase key if translation not available
   * @param {number} machMode - Machine mode
   * @param {number} prPhase - Program phase
   * @returns {string} Localized state text
   * @example
   * const state = wm.getLocalizedState(2, 11);
   * // Returns: "Centrifuga" (if translated) or "Spin" (fallback)
   */
  getLocalizedState(machMode, prPhase) {
    if (machMode === undefined || machMode === null) return 'Ready';

    const key = this.getStateTranslationKey(machMode, prPhase);
    let translated = this.getTranslation(key);

    // If translation not found and it's a numbered phase (e.g., RINSE1, RINSE2)
    // Try the base key without the number (e.g., RINSE)
    if (translated === key && /\d$/.test(key)) {
      const baseKey = key.replace(/\d+$/, '');
      translated = this.getTranslation(baseKey);
    }

    // If translation found, return it
    if (translated && translated !== key) return translated;

    // Fallback: format phase key nicely
    const phaseKey = this.getWashPhaseKey(prPhase);
    if (phaseKey && phaseKey !== 'ready') {
      // Remove numbers and format: 'anti_crease' → 'Anti Crease', 'rinse1' → 'Rinse'
      return phaseKey.replace(/_/g, ' ').replace(/\d/g, '').trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return 'Ready';
  }

  /**
   * Find program by prCode and prPosition with remote control filtering
   * @param {number} prCode - Program code
   * @param {number|null} prPosition - Program position (optional)
   * @param {boolean} remoteControlEnabled - Whether remote control is enabled (optional)
   * @returns {Object|null} Program object with id, name (localized), prCode, prPosition, translationKey, isIot, isSpecial or null if not found
   */
  findProgramByCode(prCode, prPosition = null, remoteControlEnabled = null) {
    const startCmd = this.parent.commands?.startProgram;
    if (!startCmd?.categories) return null;

    const HonParameterProgram = require('../../parameters/program');
    const searchPrCode = String(prCode);
    const searchPrPosition = prPosition !== null ? String(prPosition) : null;

    let matches = [];

    // Collect all matching programs
    for (const [key, category] of Object.entries(startCmd.categories)) {
      const catPrCode = String(category.parameters?.prCode?.value || '');
      const catPrPosition = category.parameters?.prPosition?.value !== undefined
        ? String(category.parameters.prPosition.value)
        : null;

      if (catPrCode !== searchPrCode) continue;
      if (searchPrPosition !== null && catPrPosition !== searchPrPosition) continue;

      const keyUpper = key.toUpperCase();
      const isIot = keyUpper.startsWith('IOT_');
      const isSpecial = keyUpper.startsWith('SPECIAL_');
      const translationKey = category._categoryName;

      // Get localized program name using translation key
      const localizedName = this.getLocalizedProgramName(key, translationKey);

      matches.push({
        id: key,
        name: localizedName,  // ✅ Now returns localized name instead of formatted technical name
        prCode: parseInt(prCode),
        prPosition: catPrPosition !== null ? parseInt(catPrPosition) : null,
        translationKey: translationKey || null,
        isIot,
        isSpecial
      });
    }

    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    // Multiple matches - apply filtering logic
    let filtered = matches;

    // STEP 1: Filter by remote control status (if provided)
    if (remoteControlEnabled !== null) {
      if (remoteControlEnabled) {
        // Remote ON: prefer IOT programs
        const iotMatches = matches.filter(m => m.isIot);
        if (iotMatches.length > 0) {
          filtered = iotMatches;
          console.log(`🎮 Remote control ON: filtered to ${iotMatches.length} IOT programs`);
        }
      } else {
        // Remote OFF: prefer NON-IOT programs
        const nonIotMatches = matches.filter(m => !m.isIot);
        if (nonIotMatches.length > 0) {
          filtered = nonIotMatches;
          console.log(`🎮 Remote control OFF: filtered to ${nonIotMatches.length} NON-IOT programs`);
        }
      }
    }

    // STEP 2: If still multiple, apply priority
    // Priority: Real programs > SPECIAL programs
    if (filtered.length > 1) {
      const realPrograms = filtered.filter(m => !m.isSpecial);
      if (realPrograms.length > 0) {
        filtered = realPrograms;
        console.log(`🎯 Applied priority: selected ${realPrograms.length} real (non-SPECIAL) programs`);
      }
    }

    // STEP 3: If STILL multiple, take first (shouldn't happen often)
    if (filtered.length > 1) {
      console.warn(`⚠️  Still ${filtered.length} matches for prCode=${prCode}, prPosition=${prPosition}:`);
      filtered.forEach(m => console.warn(`   - ${m.id}`));
      console.warn(`   Using first: ${filtered[0].id}`);
    }

    return filtered[0];
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
