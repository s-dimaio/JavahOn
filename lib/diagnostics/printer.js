/**
 * Pretty Printing Utilities for Diagnostic Output
 * Ported from pyhOn printer.py
 * 
 * Provides YAML-like formatting and data visualization
 */

const { HonParameterEnum, HonParameterRange } = require('../parameters');

/**
 * Print data as key-value pairs (flattened)
 * @param {any} data - Data to print
 * @param {string} key - Current key path
 * @param {boolean} start - Is this the start of recursion
 * @returns {string} Formatted output
 */
function keyPrint(data, key = '', start = true) {
    let result = '';
    
    if (Array.isArray(data)) {
        data.forEach((value, i) => {
            result += keyPrint(value, `${key}.${i}`, false);
        });
    } else if (data !== null && typeof data === 'object') {
        const sortedKeys = Object.keys(data).sort();
        for (const k of sortedKeys) {
            const newKey = start ? k : `${key}.${k}`;
            result += keyPrint(data[k], newKey, false);
        }
    } else {
        result += `${key}: ${data}\n`;
    }
    
    return result;
}

/**
 * Pretty print data in YAML-like format
 * @param {any} data - Data to print
 * @param {string} key - Current key
 * @param {number} indent - Current indentation level
 * @param {boolean} isList - Is this a list item
 * @param {string} whitespace - Whitespace character(s) for indentation
 * @returns {string} Formatted YAML-like output
 */
function prettyPrint(data, key = '', indent = 0, isList = false, whitespace = '  ') {
    let result = '';
    const space = whitespace.repeat(indent);
    
    // If data is dict/array and has a key, print the key first
    if ((Array.isArray(data) || (data !== null && typeof data === 'object')) && key) {
        result += `${space}${isList ? '- ' : ''}${key}:\n`;
        indent += 1;
    }
    
    if (Array.isArray(data)) {
        // Handle arrays
        data.forEach((value) => {
            result += prettyPrint(value, '', indent, true, whitespace);
        });
    } else if (data !== null && typeof data === 'object') {
        // Handle objects
        const sortedKeys = Object.keys(data).sort();
        sortedKeys.forEach((listKey, i) => {
            const value = data[listKey];
            result += prettyPrint(
                value,
                listKey,
                indent + (isList && i === 0 ? 0 : 0),
                isList && i === 0,
                whitespace
            );
        });
    } else {
        // Handle primitive values
        const prefix = isList ? '- ' : '';
        const keyPart = key ? `${key}: ` : '';
        result += `${space}${prefix}${keyPart}${data}\n`;
    }
    
    return result;
}

/**
 * Wrapper function for pretty printing (alias)
 * @param {any} data - Data to prettify
 * @returns {string} Formatted output
 */
function prettifyData(data) {
    return prettyPrint(data);
}

/**
 * Create commands structure from appliance commands
 * @param {Object} commands - Command objects
 * @param {boolean} concat - Whether to concatenate command.parameter names
 * @returns {Object} Commands structure
 */
function createCommands(commands, concat = false) {
    const result = {};
    
    for (const [name, command] of Object.entries(commands)) {
        const availableSettings = command.availableSettings || command.settings || {};
        
        for (const [parameter, data] of Object.entries(availableSettings)) {
            let value;
            
            if (data instanceof HonParameterEnum || data.constructor.name === 'HonParameterEnum') {
                // Enum parameter - list of values
                value = data.values || [];
            } else if (data instanceof HonParameterRange || data.constructor.name === 'HonParameterRange') {
                // Range parameter - min/max/step
                value = {
                    min: data.min,
                    max: data.max,
                    step: data.step
                };
            } else if (data.values) {
                // Generic parameter with values
                value = data.values;
            } else if (data.min !== undefined && data.max !== undefined) {
                // Generic range parameter
                value = {
                    min: data.min,
                    max: data.max,
                    step: data.step || 1
                };
            } else {
                // Skip unknown parameter types
                continue;
            }
            
            if (!concat) {
                if (!result[name]) {
                    result[name] = {};
                }
                result[name][parameter] = value;
            } else {
                result[`${name}.${parameter}`] = value;
            }
        }
    }
    
    return result;
}

/**
 * Create rules structure from command parameters
 * @param {Object} commands - Command objects
 * @param {boolean} concat - Whether to concatenate command.parameter names
 * @returns {Object} Rules structure
 */
function createRules(commands, concat = false) {
    const result = {};
    
    for (const [name, command] of Object.entries(commands)) {
        const availableSettings = command.availableSettings || command.settings || {};
        
        for (const [parameter, data] of Object.entries(availableSettings)) {
            const triggers = data.triggers || {};
            
            if (!triggers || Object.keys(triggers).length === 0) {
                continue;
            }
            
            if (!concat) {
                if (!result[name]) {
                    result[name] = {};
                }
                result[name][parameter] = triggers;
            } else {
                result[`${name}.${parameter}`] = triggers;
            }
        }
    }
    
    return result;
}

/**
 * Format appliance summary for display
 * @param {HonAppliance} appliance - Appliance instance
 * @returns {string} Formatted summary
 */
function formatApplianceSummary(appliance) {
    const lines = [];
    
    lines.push('╔═══════════════════════════════════════════════════════════╗');
    lines.push('║              Appliance Diagnostic Summary                ║');
    lines.push('╠═══════════════════════════════════════════════════════════╣');
    lines.push(`║ Type:       ${(appliance.typeName || 'Unknown').padEnd(44)} ║`);
    lines.push(`║ Model:      ${(appliance.modelName || 'Unknown').padEnd(44)} ║`);
    lines.push(`║ MAC:        ${(appliance.macAddress || 'Unknown').padEnd(44)} ║`);
    lines.push(`║ Connected:  ${String(appliance.connection).padEnd(44)} ║`);
    lines.push(`║ Commands:   ${String(Object.keys(appliance.commands || {}).length).padEnd(44)} ║`);
    lines.push(`║ Parameters: ${String(Object.keys(appliance.attributes?.parameters || {}).length).padEnd(44)} ║`);
    lines.push('╚═══════════════════════════════════════════════════════════╝');
    
    return lines.join('\n');
}

/**
 * Format command details for display
 * @param {HonCommand} command - Command instance
 * @param {string} name - Command name
 * @returns {string} Formatted command details
 */
function formatCommandDetails(command, name) {
    const lines = [];
    
    lines.push(`\n━━━ Command: ${name} ━━━`);
    
    const settings = command.availableSettings || command.settings || {};
    const settingsCount = Object.keys(settings).length;
    
    if (settingsCount === 0) {
        lines.push('  No parameters available');
        return lines.join('\n');
    }
    
    lines.push(`  Parameters: ${settingsCount}`);
    
    for (const [param, data] of Object.entries(settings)) {
        if (data instanceof HonParameterEnum || data.constructor.name === 'HonParameterEnum') {
            const values = data.values || [];
            const current = data.value !== undefined ? data.value : values[0];
            lines.push(`    • ${param}: ${current} (${values.length} options)`);
        } else if (data instanceof HonParameterRange || data.constructor.name === 'HonParameterRange') {
            const current = data.value !== undefined ? data.value : data.min;
            lines.push(`    • ${param}: ${current} [${data.min}-${data.max}, step: ${data.step}]`);
        } else {
            lines.push(`    • ${param}: ${data.value || 'N/A'}`);
        }
    }
    
    return lines.join('\n');
}

/**
 * Create a diagnostic table from data
 * @param {Object} data - Data object
 * @param {string} title - Table title
 * @returns {string} Formatted table
 */
function createTable(data, title = 'Data') {
    const lines = [];
    const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length), title.length);
    const width = Math.max(maxKeyLength + 40, 60);
    
    lines.push('┌' + '─'.repeat(width - 2) + '┐');
    lines.push('│ ' + title.padEnd(width - 3) + '│');
    lines.push('├' + '─'.repeat(width - 2) + '┤');
    
    for (const [key, value] of Object.entries(data)) {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const truncated = valueStr.length > width - maxKeyLength - 6 
            ? valueStr.substring(0, width - maxKeyLength - 9) + '...'
            : valueStr;
        lines.push(`│ ${key.padEnd(maxKeyLength)} │ ${truncated.padEnd(width - maxKeyLength - 6)}│`);
    }
    
    lines.push('└' + '─'.repeat(width - 2) + '┘');
    
    return lines.join('\n');
}

module.exports = {
    keyPrint,
    prettyPrint,
    prettifyData,
    createCommands,
    createRules,
    formatApplianceSummary,
    formatCommandDetails,
    createTable
};
