/**
 * HonParameter - Base parameter class
 * Ported from pyhOn parameter/base.py
 */

class HonParameter {
  /**
   * @param {string} key - Parameter key
   * @param {Object} attributes - Parameter attributes
   * @param {string} group - Parameter group
   */
  constructor(key, attributes, group) {
    this._key = key;
    this._attributes = attributes;
    this._category = '';
    this._typology = '';
    this._mandatory = 0;
    this._value = '';
    this._group = group;
    this._triggers = {};
    this._setAttributes();
  }

  /**
   * Set attributes from data
   * @private
   */
  _setAttributes() {
    this._category = this._attributes.category || '';
    this._typology = this._attributes.typology || '';
    this._mandatory = this._attributes.mandatory || 0;
  }

  /**
   * Get parameter key
   * @returns {string} Parameter key
   */
  get key() {
    return this._key;
  }

  /**
   * Get parameter value
   * @returns {string|number} Parameter value
   */
  get value() {
    return this._value !== null && this._value !== undefined ? this._value : '0';
  }

  /**
   * Set parameter value
   * @param {string|number} value - New value
   */
  set value(value) {
    this._value = value;
    this.checkTrigger(value);
  }

  /**
   * Get internal value (for API)
   * @returns {string} Internal value
   */
  get internValue() {
    return String(this.value);
  }

  /**
   * Get possible values
   * @returns {Array<string>} Possible values
   */
  get values() {
    return [String(this.value)];
  }

  /**
   * Get parameter category
   * @returns {string} Category
   */
  get category() {
    return this._category;
  }

  /**
   * Get parameter typology
   * @returns {string} Typology
   */
  get typology() {
    return this._typology;
  }

  /**
   * Get if parameter is mandatory
   * @returns {number} Mandatory flag
   */
  get mandatory() {
    return this._mandatory;
  }

  /**
   * Get parameter group
   * @returns {string} Group
   */
  get group() {
    return this._group;
  }

  /**
   * Add trigger for value change
   * @param {string} value - Trigger value
   * @param {Function} func - Trigger function
   * @param {Object} data - Trigger data
   */
  addTrigger(value, func, data) {
    if (this._value === value) {
      func(data);
    }
    if (!this._triggers[value]) {
      this._triggers[value] = [];
    }
    this._triggers[value].push({ func, data });
  }

  /**
   * Check and execute triggers
   * @param {string|number} value - Value to check
   */
  checkTrigger(value) {
    const triggers = {};
    for (const [k, v] of Object.entries(this._triggers)) {
      triggers[String(k).toLowerCase()] = v;
    }

    const valueStr = String(value).toLowerCase();
    if (valueStr in triggers) {
      for (const trigger of triggers[valueStr]) {
        trigger.func(trigger.data);
      }
    }
  }

  /**
   * Get triggers information
   * @returns {Object} Triggers data
   */
  get triggers() {
    const result = {};
    
    for (const [value, rules] of Object.entries(this._triggers)) {
      for (const { data: rule } of rules) {
        let param;
        
        if (rule.extras) {
          param = result[value] = result[value] || {};
          for (const [extraKey, extraValue] of Object.entries(rule.extras)) {
            param[extraKey] = param[extraKey] || {};
            param = param[extraKey][extraValue] = param[extraKey][extraValue] || {};
          }
        } else {
          param = result[value] = result[value] || {};
        }
        
        const fixedValue = rule.paramData?.fixedValue;
        if (fixedValue !== undefined) {
          param[rule.paramKey] = fixedValue;
        } else {
          param[rule.paramKey] = rule.paramData?.defaultValue || '';
        }
      }
    }
    
    return result;
  }

  /**
   * Reset parameter to defaults
   */
  reset() {
    this._setAttributes();
  }

  /**
   * String representation
   * @returns {string} Parameter description
   */
  toString() {
    return `${this.constructor.name} <${this.key}>`;
  }
}

module.exports = HonParameter;
