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
   * Get IDs of all programs
   * @returns {Array<string>} Program IDs
   */
  get ids() {
    const result = [];
    for (const [name, data] of Object.entries(this._programs)) {
      if (typeof data === 'object' && data.parName) {
        result.push(data.parName);
      }
    }
    return result;
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
