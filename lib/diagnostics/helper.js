/**
 * Helper Utilities for Diagnostics
 * Ported from pyhOn helper.py
 */

/**
 * Convert string to float, handling both commas and dots as decimal separators
 * @param {string|number} value - Value to convert
 * @returns {number} Float value
 */
function strToFloat(value) {
    if (typeof value === 'number') {
        return value;
    }
    
    try {
        // Try to parse as integer first
        const intValue = parseInt(value, 10);
        if (!isNaN(intValue) && String(intValue) === String(value)) {
            return intValue;
        }
    } catch (e) {
        // Continue to float parsing
    }
    
    // Parse as float, replacing comma with dot
    const floatValue = parseFloat(String(value).replace(',', '.'));
    
    if (isNaN(floatValue)) {
        throw new Error(`Cannot convert '${value}' to float`);
    }
    
    return floatValue;
}

/**
 * Safely get nested object property
 * @param {Object} obj - Object to query
 * @param {string} path - Dot-notation path (e.g., 'a.b.c')
 * @param {any} defaultValue - Default value if path not found
 * @returns {any} Value at path or default
 */
function getNestedProperty(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
        if (result === null || result === undefined || typeof result !== 'object') {
            return defaultValue;
        }
        result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
}

/**
 * Set nested object property
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot-notation path
 * @param {any} value - Value to set
 */
function setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    
    const cloned = {};
    for (const [key, value] of Object.entries(obj)) {
        cloned[key] = deepClone(value);
    }
    
    return cloned;
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted size string
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Sanitize filename for safe filesystem usage
 * @param {string} filename - Filename to sanitize
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
function isEmpty(value) {
    if (value === null || value === undefined) {
        return true;
    }
    
    if (typeof value === 'string') {
        return value.trim().length === 0;
    }
    
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    
    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }
    
    return false;
}

/**
 * Merge two objects deeply
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            if (result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
                result[key] = deepMerge(result[key], value);
            } else {
                result[key] = deepClone(value);
            }
        } else {
            result[key] = value;
        }
    }
    
    return result;
}

module.exports = {
    strToFloat,
    getNestedProperty,
    setNestedProperty,
    deepClone,
    formatBytes,
    formatDuration,
    sanitizeFilename,
    isEmpty,
    deepMerge
};
