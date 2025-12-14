/**
 * Diagnostics Module for hOn Appliances
 * Exports all diagnostic utilities
 */

const {
    anonymizeData,
    loadData,
    writeToJson,
    exportApplianceData,
    createZipArchive,
    exportToYaml,
    generateDiagnosticReport
} = require('./diagnose');

const {
    keyPrint,
    prettyPrint,
    prettifyData,
    createCommands,
    createRules,
    formatApplianceSummary,
    formatCommandDetails,
    createTable
} = require('./printer');

const {
    strToFloat,
    getNestedProperty,
    setNestedProperty,
    deepClone,
    formatBytes,
    formatDuration,
    sanitizeFilename,
    isEmpty,
    deepMerge
} = require('./helper');

module.exports = {
    // Diagnostic functions
    anonymizeData,
    loadData,
    writeToJson,
    exportApplianceData,
    createZipArchive,
    exportToYaml,
    generateDiagnosticReport,
    
    // Printer functions
    keyPrint,
    prettyPrint,
    prettifyData,
    createCommands,
    createRules,
    formatApplianceSummary,
    formatCommandDetails,
    createTable,
    
    // Helper functions
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
