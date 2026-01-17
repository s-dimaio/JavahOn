/**
 * ApplianceBase - Base class for appliance-specific logic
 * Ported from pyhOn appliances/base.py
 */

class ApplianceBase {
  /**
   * @param {Object} appliance - Parent appliance
   */
  constructor(appliance) {
    this.parent = appliance;
  }

  /**
   * Process attributes and add programName
   * @param {Object} data - Attributes data
   * @returns {Object} Processed attributes
   */
  attributes(data) {
    let programName = 'No Program';
    
    try {
      // Get prCode and prPosition from parameters
      const prCodeParam = data.parameters?.prCode;
      const prPositionParam = data.parameters?.prPosition;
      
      const prCode = prCodeParam ? parseInt(String(prCodeParam.value || prCodeParam)) : 0;
      const prPosition = prPositionParam ? parseInt(String(prPositionParam.value || prPositionParam)) : null;
      
      if (prCode) {
        // Try findProgramByCode first (if available in extra)
        if (this.parent._extra && typeof this.parent._extra.findProgramByCode === 'function') {
          const program = this.parent._extra.findProgramByCode(prCode, prPosition);
          if (program && program.name) {
            programName = program.name;
          }
        }
        
        // Fallback to ids mapping if findProgramByCode not available or returned nothing
        if (programName === 'No Program') {
          const startCmd = this.parent.commands?.startProgram?.parameters?.program;
          if (startCmd && startCmd.ids) {
            programName = startCmd.ids[prCode] || programName;
          }
        }
      }
    } catch (error) {
      // Keep default "No Program" if error
    }
    
    data.programName = programName;
    return data;
  }

  /**
   * Process settings
   * @param {Object} settings - Settings data
   * @returns {Object} Processed settings
   */
  settings(settings) {
    return settings;
  }
}

module.exports = ApplianceBase;
