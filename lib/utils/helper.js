/**
 * Helper utilities
 * Ported from pyhOn helper.py
 */

/**
 * Convert string to float
 * @param {string|number} value - Value to convert
 * @returns {number} Float value
 */
function strToFloat(value) {
  if (typeof value === 'number') {
    return value;
  }
  
  const stringValue = String(value);
  
  // Try to parse as float
  const parsed = parseFloat(stringValue);
  
  if (isNaN(parsed)) {
    throw new Error(`Cannot convert '${value}' to float`);
  }
  
  return parsed;
}

module.exports = {
  strToFloat
};
