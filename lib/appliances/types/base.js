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
      // Get prCode from parameters
      const prCode = parseInt(String(data.parameters?.prCode?.value || data.parameters?.prCode || '0'));
      
      if (prCode) {
        // Get startProgram.program parameter
        const startCmd = this.parent.commands?.startProgram?.parameters?.program;
        
        if (startCmd && startCmd.ids) {
          // Get program name from ids mapping
          programName = startCmd.ids[prCode] || programName;
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
