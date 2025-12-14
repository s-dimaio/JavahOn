/**
 * HonParameterFixed - Fixed value parameter
 * Ported from pyhOn parameter/fixed.py
 */

const HonParameter = require('./base');

class HonParameterFixed extends HonParameter {
  /**
   * @param {string} key - Parameter key
   * @param {Object} attributes - Parameter attributes
   * @param {string} group - Parameter group
   */
  constructor(key, attributes, group) {
    super(key, attributes, group);
    this._value = '';
    this._setAttributes();
  }

  /**
   * Set attributes from data
   * @private
   */
  _setAttributes() {
    super._setAttributes();
    this._value = this._attributes.fixedValue || '';
  }

  /**
   * Get parameter value
   * @returns {string|number} Parameter value
   */
  get value() {
    return this._value !== '' ? this._value : '0';
  }

  /**
   * Set parameter value (fixed values can be changed)
   * @param {string|number} value - New value
   */
  set value(value) {
    // Fixed values seems being not so fixed as thought
    this._value = value;
    this.checkTrigger(value);
  }

  /**
   * String representation
   * @returns {string} Parameter description
   */
  toString() {
    return `${this.constructor.name} (<${this.key}> fixed)`;
  }
}

module.exports = HonParameterFixed;
