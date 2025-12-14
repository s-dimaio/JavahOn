/**
 * HonParameterEnum - Enumeration parameter with multiple choices
 * Ported from pyhOn parameter/enum.py
 */

const HonParameter = require('./base');

/**
 * Clean enum value
 * @param {string|number} value - Value to clean
 * @returns {string} Cleaned value
 */
function cleanValue(value) {
  return String(value)
    .replace(/^\[|\]$/g, '')  // Remove [ ]
    .replace(/\|/g, '_')       // Replace | with _
    .toLowerCase()
    .trim();
}

class HonParameterEnum extends HonParameter {
  /**
   * @param {string} key - Parameter key
   * @param {Object} attributes - Parameter attributes
   * @param {string} group - Parameter group
   */
  constructor(key, attributes, group) {
    super(key, attributes, group);
    this._default = '';
    this._value = '';
    this._values = [];
    this._setAttributes();
    
    // Add default value to values if not present
    if (this._default && !this.values.includes(cleanValue(this._default.replace(/^\[|\]$/g, '')))) {
      this._values.push(this._default);
    }
  }

  /**
   * Set attributes from data
   * @private
   */
  _setAttributes() {
    super._setAttributes();
    this._default = this._attributes.defaultValue || '';
    this._value = this._default || '0';
    this._values = this._attributes.enumValues || [];
  }

  /**
   * Get possible values
   * @returns {Array<string>} Cleaned possible values
   */
  get values() {
    return this._values.map(v => cleanValue(v));
  }

  /**
   * Set possible values
   * @param {Array<string>} values - New values
   */
  set values(values) {
    this._values = values;
  }

  /**
   * Get internal value (for API)
   * @returns {string} Internal value
   */
  get internValue() {
    return this._value !== null && this._value !== undefined 
      ? String(this._value) 
      : String(this.values[0] || '0');
  }

  /**
   * Get parameter value
   * @returns {string|number} Cleaned parameter value
   */
  get value() {
    return this._value !== null && this._value !== undefined 
      ? cleanValue(this._value) 
      : (this.values[0] || '0');
  }

  /**
   * Set parameter value
   * @param {string} value - New value
   */
  set value(value) {
    if (this.values.includes(value)) {
      this._value = value;
      this.checkTrigger(value);
    } else {
      throw new Error(`Allowed values: ${this._values.join(', ')} But was: ${value}`);
    }
  }

  /**
   * String representation
   * @returns {string} Parameter description
   */
  toString() {
    return `${this.constructor.name} (<${this.key}> [${this.values.join(', ')}])`;
  }
}

module.exports = HonParameterEnum;
