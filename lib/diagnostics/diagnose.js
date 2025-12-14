/**
 * Diagnostic Utilities for hOn Appliances
 * Ported from pyhOn diagnose.py
 * 
 * Provides data export, anonymization, and diagnostic tools
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const archiver = require('archiver');
const { prettifyData, createCommands, createRules } = require('./printer');

/**
 * Anonymize sensitive data from diagnostic output
 * @param {string} data - Data to anonymize
 * @returns {string} Anonymized data
 */
function anonymizeData(data) {
    const defaultDate = '1970-01-01T00:00:00.0Z';
    const defaultMac = 'xx-xx-xx-xx-xx-xx';
    
    // Anonymize MAC addresses
    let result = data.replace(/[0-9A-Fa-f]{2}(-[0-9A-Fa-f]{2}){5}/g, defaultMac);
    
    // Anonymize timestamps
    result = result.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, defaultDate);
    
    // Anonymize sensitive fields
    const sensibleFields = [
        'serialNumber',
        'code',
        'nickName',
        'mobileId',
        'PK',
        'SK',
        'lat',
        'lng'
    ];
    
    for (const field of sensibleFields) {
        const regex = new RegExp(`"${field}.*?":\\s*"?(.+?)"?,?\\n`, 'g');
        const matches = [...result.matchAll(regex)];
        
        for (const match of matches) {
            const original = match[1];
            let replacement = original
                .replace(/[a-z]/g, 'x')
                .replace(/[A-Z]/g, 'X')
                .replace(/\d/g, '1');
            result = result.replace(original, replacement);
        }
    }
    
    return result;
}

/**
 * Load specific data from appliance API
 * @param {HonAppliance} appliance - Appliance instance
 * @param {string} topic - Data topic to load
 * @param {HonAPI} api - API client instance
 * @returns {Promise<Object>} Topic name and data
 */
async function loadData(appliance, topic, api) {
    let data;
    
    switch (topic) {
        case 'commands':
            data = await api.loadCommands(appliance);
            break;
        case 'attributes':
            data = await api.loadAttributes(appliance);
            break;
        case 'command_history':
            data = await api.loadCommandHistory(appliance);
            break;
        case 'statistics':
            data = await api.loadStatistics(appliance);
            break;
        case 'maintenance':
            data = await api.loadMaintenance(appliance);
            break;
        case 'appliance_data':
            data = await api.loadApplianceData(appliance);
            break;
        default:
            throw new Error(`Unknown topic: ${topic}`);
    }
    
    return { topic, data };
}

/**
 * Write data to JSON file
 * @param {Object} data - Data to write
 * @param {string} topic - Topic name for filename
 * @param {string} dirPath - Directory path
 * @param {boolean} anonymous - Whether to anonymize data
 * @returns {Promise<string>} Written file path
 */
async function writeToJson(data, topic, dirPath, anonymous = false) {
    let jsonData = JSON.stringify(data, null, 4);
    
    if (anonymous) {
        jsonData = anonymizeData(jsonData);
    }
    
    const filePath = path.join(dirPath, `${topic}.json`);
    await fs.writeFile(filePath, jsonData, 'utf-8');
    
    return filePath;
}

/**
 * Export all appliance data to JSON files
 * @param {HonAppliance} appliance - Appliance instance
 * @param {HonAPI} api - API client instance
 * @param {string} outputPath - Output directory path
 * @param {boolean} anonymous - Whether to anonymize data
 * @returns {Promise<string[]>} Array of created file paths
 */
async function exportApplianceData(appliance, api, outputPath, anonymous = false) {
    const requests = [
        'commands',
        'attributes',
        'command_history',
        'statistics',
        'maintenance',
        'appliance_data'
    ];
    
    // Create output directory
    const applianceType = appliance.applianceType || appliance.typeName || 'unknown';
    const modelId = appliance.modelId || appliance.applianceModelId || 'unknown';
    const dirName = `${applianceType}_${modelId}`.toLowerCase();
    const dirPath = path.join(outputPath, dirName);
    
    await fs.mkdir(dirPath, { recursive: true });
    
    // Load all data in parallel
    const dataPromises = requests.map(topic => loadData(appliance, topic, api));
    const apiData = await Promise.all(dataPromises);
    
    // Write all JSON files
    const filePromises = apiData.map(({ topic, data }) => 
        writeToJson(data, topic, dirPath, anonymous)
    );
    const files = await Promise.all(filePromises);
    
    return files;
}

/**
 * Create ZIP archive of appliance diagnostic data
 * @param {HonAppliance} appliance - Appliance instance
 * @param {HonAPI} api - API client instance
 * @param {string} outputPath - Output directory path
 * @param {boolean} anonymous - Whether to anonymize data
 * @returns {Promise<string>} Path to created ZIP file
 */
async function createZipArchive(appliance, api, outputPath, anonymous = false) {
    // Export all data files
    const files = await exportApplianceData(appliance, api, outputPath, anonymous);
    
    if (files.length === 0) {
        throw new Error('No files to archive');
    }
    
    // Get directory to archive
    const dirPath = path.dirname(files[0]);
    const dirName = path.basename(dirPath);
    const zipPath = path.join(outputPath, `${dirName}.zip`);
    
    // Create ZIP archive
    await new Promise((resolve, reject) => {
        const output = fsSync.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', resolve);
        archive.on('error', reject);
        
        archive.pipe(output);
        archive.directory(dirPath, false);
        archive.finalize();
    });
    
    // Remove original directory
    await fs.rm(dirPath, { recursive: true, force: true });
    
    return `${dirName}.zip`;
}

/**
 * Export appliance data to YAML format
 * @param {HonAppliance} appliance - Appliance instance
 * @param {boolean} anonymous - Whether to anonymize data
 * @returns {string} YAML formatted data
 */
function exportToYaml(appliance, anonymous = false) {
    // Prepare data structure
    const data = {
        attributes: { ...appliance.attributes },
        appliance: { ...appliance.info },
        statistics: { ...appliance.statistics },
        additional_data: appliance.additionalData || {}
    };
    
    // Add command parameter groups
    for (const [name, command] of Object.entries(appliance.commands || {})) {
        data[name] = command.parameterGroups || {};
    }
    
    // Add extra command data
    const extraData = {};
    for (const [name, command] of Object.entries(appliance.commands || {})) {
        if (command.data && Object.keys(command.data).length > 0) {
            extraData[name] = command.data;
        }
    }
    
    if (Object.keys(extraData).length > 0) {
        data.extra_command_data = extraData;
    }
    
    // Remove sensitive data if anonymous
    if (anonymous) {
        const sensibleFields = ['serialNumber', 'coords'];
        for (const field of sensibleFields) {
            if (data.appliance) {
                delete data.appliance[field];
            }
        }
    }
    
    // Create YAML output
    let result = prettifyData({ data });
    
    // Add commands section
    const commands = createCommands(appliance.commands || {});
    if (Object.keys(commands).length > 0) {
        result += prettifyData({ commands });
    }
    
    // Add rules section
    const rules = createRules(appliance.commands || {});
    if (Object.keys(rules).length > 0) {
        result += prettifyData({ rules });
    }
    
    // Anonymize if requested
    if (anonymous) {
        result = anonymizeData(result);
    }
    
    return result;
}

/**
 * Generate diagnostic report for appliance
 * @param {HonAppliance} appliance - Appliance instance
 * @param {HonAPI} api - API client instance
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Diagnostic report
 */
async function generateDiagnosticReport(appliance, api, options = {}) {
    const {
        format = 'yaml', // 'yaml', 'json', or 'zip'
        outputPath = './diagnostics',
        anonymous = false,
        includeCommands = true,
        includeAttributes = true,
        includeStatistics = true
    } = options;
    
    const report = {
        appliance: {
            type: appliance.typeName || appliance.applianceType,
            model: appliance.modelName || appliance.modelId,
            mac: anonymous ? 'xx-xx-xx-xx-xx-xx' : appliance.macAddress,
            connected: appliance.connection
        },
        timestamp: new Date().toISOString(),
        format
    };
    
    if (format === 'zip') {
        const zipFile = await createZipArchive(appliance, api, outputPath, anonymous);
        report.file = zipFile;
        report.path = path.join(outputPath, zipFile);
    } else if (format === 'json') {
        const files = await exportApplianceData(appliance, api, outputPath, anonymous);
        report.files = files;
        report.path = outputPath;
    } else {
        // YAML format (default)
        const yamlContent = exportToYaml(appliance, anonymous);
        const fileName = `${appliance.typeName || 'appliance'}_diagnostic.yaml`;
        const filePath = path.join(outputPath, fileName);
        
        await fs.mkdir(outputPath, { recursive: true });
        await fs.writeFile(filePath, yamlContent, 'utf-8');
        
        report.file = fileName;
        report.path = filePath;
        report.preview = yamlContent.substring(0, 500) + '...';
    }
    
    return report;
}

module.exports = {
    anonymizeData,
    loadData,
    writeToJson,
    exportApplianceData,
    createZipArchive,
    exportToYaml,
    generateDiagnosticReport
};
