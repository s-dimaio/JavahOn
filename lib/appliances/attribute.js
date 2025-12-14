/**
 * HonAttribute - Attribute value management with locking
 * Ported from pyhOn attributes.py
 */

const { strToFloat } = require('../utils/helper');

const LOCK_TIMEOUT = 10; // seconds

class HonAttribute {
  /**
   * @param {Object|string} data - Attribute data
   */
  constructor(data) {
    this._value = '';
    this._lastUpdate = null;
    this._lockTimestamp = null;
    this.update(data);
  }

  /**
   * Get attribute value (converted to float if possible)
   * @returns {number|string} Attribute value
   */
  get value() {
    try {
      return strToFloat(this._value);
    } catch (error) {
      return this._value;
    }
  }

  /**
   * Set attribute value
   * @param {string} value - New value
   */
  set value(value) {
    this._value = value;
  }

  /**
   * Get last update timestamp
   * @returns {Date|null} Last update date
   */
  get lastUpdate() {
    return this._lastUpdate;
  }

  /**
   * Check if attribute is locked
   * @returns {boolean} True if locked
   */
  get lock() {
    if (!this._lockTimestamp) {
      return false;
    }
    const lockUntil = new Date(this._lockTimestamp.getTime() + LOCK_TIMEOUT * 1000);
    return lockUntil >= new Date();
  }

  /**
   * Update attribute value
   * @param {Object|string} data - New data
   * @param {boolean} shield - Force update even if locked
   * @returns {boolean} True if updated
   */
  update(data, shield = false) {
    if (this.lock && !shield) {
      return false;
    }

    if (shield) {
      this._lockTimestamp = new Date();
    }

    if (typeof data === 'string') {
      this.value = data;
      return true;
    }

    this.value = data.parNewVal || '';
    
    if (data.lastUpdate) {
      try {
        this._lastUpdate = new Date(data.lastUpdate);
      } catch (error) {
        this._lastUpdate = null;
      }
    }

    return true;
  }

  /**
   * String representation
   * @returns {string} Value as string
   */
  toString() {
    return this._value;
  }
}

module.exports = HonAttribute;
