/**
 * Washing Machine Appliance
 * Ported from pyhOn appliances/wm.py
 */

const ApplianceBase = require('./base');

class WashingMachine extends ApplianceBase {
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
}

module.exports = WashingMachine;
