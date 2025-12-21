/**
 * HonParameterProgram - Program/recipe parameter
 * Ported from pyhOn parameter/program.py
 */

const HonParameterEnum = require('./enum');

class HonParameterProgram extends HonParameterEnum {
  /**
   * @param {string} key - Parameter key
   * @param {Object} attributes - Parameter attributes (contains programs)
   * @param {string} group - Parameter group
   */
  constructor(key, attributes, group) {
    super(key, attributes, group);
    this._programs = attributes;
    this._value = '';
    this._values = [];
    this._typology = 'enum';
    this._setAttributes();
  }

  /**
   * Set attributes from data
   * @private
   */
  _setAttributes() {
    // Don't call super._setAttributes() as we have different structure
    this._category = this._attributes.category || '';
    this._mandatory = this._attributes.mandatory || 0;
    
    // Extract program names as values
    this._values = [];
    if (this._programs && typeof this._programs === 'object') {
      this._values = Object.keys(this._programs).filter(key => 
        key !== 'category' && 
        key !== 'typology' && 
        key !== 'mandatory'
      );
    }
    
    this._value = this._values[0] || '';
  }

  /**
   * Get IDs mapping of all programs (prCode -> program name)
   * Excludes programs starting with "iot_" and favorites
   * @returns {Object<number, string>} Map of prCode to program name
   */
  get ids() {
    const result = {};
    for (const [name, command] of Object.entries(this._programs)) {
      // Skip special keys
      if (name === 'category' || name === 'typology' || name === 'mandatory') {
        continue;
      }
      // Skip programs starting with "iot_"
      if (name.startsWith('iot_')) {
        continue;
      }
      // Skip if no prCode parameter
      if (!command.parameters || !command.parameters.prCode) {
        continue;
      }
      // Skip favorites
      if (command.parameters.favourite && String(command.parameters.favourite.value) === '1') {
        continue;
      }
      
      const prCode = parseInt(command.parameters.prCode.value);
      result[prCode] = name;
    }
    
    // Sort by prCode
    const sorted = {};
    Object.keys(result)
      .map(k => parseInt(k))
      .sort((a, b) => a - b)
      .forEach(key => {
        sorted[key] = result[key];
      });
    
    return sorted;
  }

  /**
   * String representation
   * @returns {string} Parameter description
   */
  toString() {
    return `${this.constructor.name} (<${this.key}> [${this.values.join(', ')}])`;
  }
}

module.exports = HonParameterProgram;
