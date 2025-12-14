/**
 * HonParameterRange - Numeric range parameter
 * Ported from pyhOn parameter/range.py
 */

const HonParameter = require('./base');
const { strToFloat } = require('../utils/helper');

class HonParameterRange extends HonParameter {
  /**
   * @param {string} key - Parameter key
   * @param {Object} attributes - Parameter attributes
   * @param {string} group - Parameter group
   */
  constructor(key, attributes, group) {
    super(key, attributes, group);
    this._min = 0;
    this._max = 0;
    this._step = 0;
    this._default = 0;
    this._value = 0;
    this._setAttributes();
  }

  /**
   * Set attributes from data
   * @private
   */
  _setAttributes() {
    super._setAttributes();
    this._min = strToFloat(this._attributes.minimumValue || 0);
    this._max = strToFloat(this._attributes.maximumValue || 0);
    this._step = strToFloat(this._attributes.incrementValue || 0);
    this._default = strToFloat(this._attributes.defaultValue || this._min);
    this._value = this._default;
  }

  /**
   * Get minimum value
   * @returns {number} Minimum value
   */
  get min() {
    return this._min;
  }

  /**
   * Set minimum value
   * @param {number} mini - New minimum
   */
  set min(mini) {
    this._min = mini;
  }

  /**
   * Get maximum value
   * @returns {number} Maximum value
   */
  get max() {
    return this._max;
  }

  /**
   * Set maximum value
   * @param {number} maxi - New maximum
   */
  set max(maxi) {
    this._max = maxi;
  }

  /**
   * Get step value
   * @returns {number} Step value
   */
  get step() {
    return this._step || 1;
  }

  /**
   * Set step value
   * @param {number} step - New step
   */
  set step(step) {
    this._step = step;
  }

  /**
   * Get parameter value
   * @returns {string|number} Parameter value
   */
  get value() {
    return this._value !== null && this._value !== undefined ? this._value : this.min;
  }

  /**
   * Set parameter value
   * @param {string|number} value - New value
   */
  set value(value) {
    const numValue = strToFloat(value);
    
    // Check if value is in range and aligned with step
    if (numValue >= this.min && numValue <= this.max) {
      const stepCheck = ((numValue - this.min) * 100) % (this.step * 100);
      if (stepCheck === 0) {
        this._value = numValue;
        this.checkTrigger(numValue);
        return;
      }
    }
    
    const allowed = `min ${this.min} max ${this.max} step ${this.step}`;
    throw new Error(`Allowed: ${allowed} But was: ${numValue}`);
  }

  /**
   * Get possible values
   * @returns {Array<string>} All possible values in range
   */
  get values() {
    const result = [];
    let i = this.min;
    while (i <= this.max) {
      result.push(String(i));
      i += this.step;
    }
    return result;
  }

  /**
   * String representation
   * @returns {string} Parameter description
   */
  toString() {
    return `${this.constructor.name} (<${this.key}> [${this.min} - ${this.max}])`;
  }
}

module.exports = HonParameterRange;
