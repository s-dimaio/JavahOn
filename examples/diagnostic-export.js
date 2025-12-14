/**
 * Diagnostic Export Example
 * Demonstrates appliance diagnostic data export in various formats
 */

const { HonAuth, HonAPI, HonDevice, HonAppliance, diagnostics } = require('..');

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       🔧 JavahOn - Appliance Diagnostics Export          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();

    // Get credentials
    const email = process.argv[2] || process.env.HON_EMAIL;
    const password = process.argv[3] || process.env.HON_PASSWORD;

    if (!email || !password) {
        console.log('Usage: node examples/diagnostic-export.js <email> <password>');
        console.log('Or set HON_EMAIL and HON_PASSWORD environment variables');
        process.exit(1);
    }

    try {
        // Step 1: Authentication
        console.log('🔑 Step 1: Authenticating...');
        const device = new HonDevice('DiagnosticExport');
        const auth = new HonAuth(null, email, password, device);
        await auth.authenticate();
        console.log('✅ Authentication successful!');
        console.log();

        // Step 2: Create API client
        console.log('🔧 Step 2: Creating API client...');
        const api = new HonAPI(auth);
        console.log('✅ API client ready!');
        console.log();

        // Step 3: Load appliances
        console.log('📱 Step 3: Loading appliances...');
        const appliancesRaw = await api.loadAppliances();
        console.log(`✅ Found ${appliancesRaw.length} appliance(s)`);
        console.log();

        if (appliancesRaw.length === 0) {
            console.log('No appliances found.');
            return;
        }

        // Convert to HonAppliance instances
        const appliances = appliancesRaw.map(data => new HonAppliance(api, data));

        // Display appliances
        console.log('Available appliances:');
        appliances.forEach((appliance, index) => {
            console.log(`  ${index + 1}. ${appliance.typeName || 'Unknown'} - ${appliance.modelName || 'Unknown'}`);
        });
        console.log();

        // Step 4: Load commands for all appliances
        console.log('⚙️  Step 4: Loading commands for all appliances...');
        const appliancesWithCommands = [];
        
        for (let i = 0; i < appliances.length; i++) {
            const appliance = appliances[i];
            try {
                console.log(`  Loading commands for ${appliance.typeName || 'Unknown'} (${i + 1}/${appliances.length})...`);
                await appliance.loadCommands();  // Use appliance.loadCommands() instead of api.loadCommands()
                appliancesWithCommands.push(appliance);
                console.log(`  ✓ Loaded ${Object.keys(appliance.commands || {}).length} commands`);
            } catch (error) {
                console.log(`  ⚠ Failed to load commands: ${error.message}`);
                console.log(`  Stack: ${error.stack}`);
                // Still add the appliance even if commands failed
                appliancesWithCommands.push(appliance);
            }
        }
        console.log(`✅ Commands loaded for ${appliancesWithCommands.length} appliance(s)`);
        console.log();

        // Step 5: Export to JSON with all appliances and their commands
        console.log('📄 Step 5: Exporting all appliances to JSON...');
        
        const fs = require('fs').promises;
        const jsonFile = './diagnostics/appliance_diagnostic.json';
        
        // Build appliance data with commands
        const appliancesData = appliancesWithCommands.map(appliance => {
            const commandsList = [];
            
            // Extract commands if available
            const commands = appliance.commands || {};
            for (const [cmdName, cmdObj] of Object.entries(commands)) {
                const cmdParams = {};
                
                // Extract parameters if available
                if (cmdObj.parameters) {
                    for (const [paramName, paramObj] of Object.entries(cmdObj.parameters)) {
                        cmdParams[paramName] = {
                            type: paramObj.constructor.name,
                            value: paramObj.value,
                            min: paramObj.min,
                            max: paramObj.max,
                            step: paramObj.step,
                            values: paramObj.values
                        };
                    }
                }
                
                commandsList.push({
                    name: cmdName,
                    parameters: cmdParams
                });
            }
            
            return {
                id: appliance.info.applianceId,
                brand: appliance.brand,
                model: appliance.modelName,
                type: appliance.applianceType,
                typeName: appliance.info.applianceTypeName,
                series: appliance.info.series,
                serialNumber: appliance.info.serialNumber,
                code: appliance.code,
                connectivity: appliance.info.connectivity,
                status: appliance.info.applianceStatus,
                enrollmentDate: appliance.info.enrollmentDate,
                firmware: appliance.info.fwVersion,
                commands: commandsList,
                commandsCount: commandsList.length
            };
        });
        
        const jsonContent = JSON.stringify({
            appliances: appliancesData,
            metadata: {
                exportedAt: new Date().toISOString(),
                exported_by: 'JavahOn Diagnostic Export',
                total_appliances: appliancesData.length,
                has_commands: appliancesData.some(a => a.commands.length > 0)
            }
        }, null, 2);
        
        await fs.mkdir('./diagnostics', { recursive: true });
        await fs.writeFile(jsonFile, jsonContent, 'utf-8');
        
        console.log(`✅ JSON exported to: ${jsonFile}`);
        console.log(`   File size: ${diagnostics.formatBytes(jsonContent.length)}`);
        console.log(`   Total appliances: ${appliancesData.length}`);
        console.log();
        console.log('Preview (first 100 lines):');
        console.log('─'.repeat(60));
        const lines = jsonContent.split('\n');
        console.log(lines.slice(0, 100).join('\n'));
        if (lines.length > 100) {
            console.log(`... [${lines.length - 100} more lines]`);
        }
        console.log('─'.repeat(60));
        console.log();

        // Step 6: Anonymized export
        console.log('🔒 Step 6: Creating anonymized export...');
        
        const anonAppliancesData = appliancesData.map(appliance => ({
            brand: appliance.brand,
            model: appliance.model,
            type: appliance.type,
            typeName: appliance.typeName,
            series: appliance.series,
            connectivity: appliance.connectivity,
            status: appliance.status,
            enrollmentDate: appliance.enrollmentDate,
            firmware: appliance.firmware,
            serialNumber: '[ANONYMIZED]',
            code: '[ANONYMIZED]',
            id: '[ANONYMIZED]',
            commandsCount: appliance.commandsCount,
            commands: appliance.commands.map(cmd => ({
                name: cmd.name,
                parametersCount: Object.keys(cmd.parameters).length,
                parameters: Object.keys(cmd.parameters).reduce((acc, paramName) => {
                    const param = cmd.parameters[paramName];
                    acc[paramName] = {
                        type: param.type,
                        hasMinMax: !!(param.min || param.max),
                        hasValues: !!(param.values && param.values.length)
                        // value omitted for privacy
                    };
                    return acc;
                }, {})
            }))
        }));
        
        const anonymizedJson = JSON.stringify({
            appliances: anonAppliancesData,
            metadata: {
                exportedAt: new Date().toISOString(),
                anonymized: true,
                total_appliances: anonAppliancesData.length,
                sensitive_data_removed: ['serialNumber', 'code', 'applianceId', 'MAC address', 'coordinates', 'parameter values']
            }
        }, null, 2);
        
        const anonFile = './diagnostics/appliance_diagnostic_anonymous.json';
        await fs.writeFile(anonFile, anonymizedJson, 'utf-8');
        
        console.log(`✅ Anonymized export saved to: ${anonFile}`);
        console.log(`   File size: ${diagnostics.formatBytes(anonymizedJson.length)}`);
        console.log(`   Total appliances: ${anonAppliancesData.length}`);
        console.log('   Sensitive data (serial, code, MAC, parameter values) anonymized');
        console.log();

        // Step 7: Export Summary
        console.log('📈 Step 7: Export Summary');
        console.log('─'.repeat(60));
        console.log(`Total appliances:        ${appliancesData.length}`);
        console.log(`Appliances with commands: ${appliancesData.filter(a => a.commands.length > 0).length}`);
        console.log(`Total commands:          ${appliancesData.reduce((sum, a) => sum + a.commands.length, 0)}`);
        console.log(`JSON export size:        ${diagnostics.formatBytes(jsonContent.length)}`);
        console.log(`Anonymized JSON size:    ${diagnostics.formatBytes(anonymizedJson.length)}`);
        console.log('─'.repeat(60));
        console.log();

        // Appliances breakdown
        console.log('Appliances breakdown:');
        appliancesData.forEach((app, idx) => {
            console.log(`  ${idx + 1}. ${app.typeName} (${app.brand}) - ${app.commands.length} commands`);
        });
        console.log();

        console.log('✅ All exports completed successfully!');
        console.log();
        console.log('Generated files:');
        console.log('  • ./diagnostics/appliance_diagnostic.json (with commands)');
        console.log('  • ./diagnostics/appliance_diagnostic_anonymous.json (anonymized)');
        console.log();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run the example
main();
