/**
 * Diagnostic Export Example
 * Demonstrates appliance diagnostic data export in various formats
 */

const { HonAuth, HonAPI, HonDevice, diagnostics } = require('..');

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
        const appliances = await api.loadAppliances();
        console.log(`✅ Found ${appliances.length} appliance(s)`);
        console.log();

        if (appliances.length === 0) {
            console.log('No appliances found.');
            return;
        }

        // Display appliances
        console.log('Available appliances:');
        appliances.forEach((appliance, index) => {
            console.log(`  ${index + 1}. ${appliance.typeName || 'Unknown'} - ${appliance.modelName || 'Unknown'}`);
        });
        console.log();

        // Use first appliance
        const appliance = appliances[0];
        console.log(`Selected: ${appliance.typeName || 'Unknown'} (${appliance.modelName || 'Unknown'})`);
        console.log();

        // Step 4: Display appliance summary
        console.log('📊 Step 4: Appliance Summary');
        console.log(diagnostics.formatApplianceSummary(appliance));
        console.log();

        // Step 5: Export to JSON (migliore di YAML per dati strutturati)
        console.log('📄 Step 5: Exporting to JSON...');
        
        const fs = require('fs').promises;
        const jsonFile = './diagnostics/appliance_diagnostic.json';
        const jsonContent = JSON.stringify({
            appliance: {
                id: appliance.applianceId,
                brand: appliance.brand,
                model: appliance.modelName,
                type: appliance.applianceTypeName,
                series: appliance.series,
                serialNumber: appliance.serialNumber,
                code: appliance.code,
                connectivity: appliance.connectivity,
                status: appliance.applianceStatus,
                enrollmentDate: appliance.enrollmentDate
            },
            metadata: {
                exportedAt: new Date().toISOString(),
                exported_by: 'JavahOn Diagnostic Export'
            }
        }, null, 2);
        
        await fs.mkdir('./diagnostics', { recursive: true });
        await fs.writeFile(jsonFile, jsonContent, 'utf-8');
        
        console.log(`✅ JSON exported to: ${jsonFile}`);
        console.log(`   File size: ${diagnostics.formatBytes(jsonContent.length)}`);
        console.log();
        console.log('Preview:');
        console.log('─'.repeat(60));
        console.log(jsonContent);
        console.log('─'.repeat(60));
        console.log();

        // Step 6-9: Anonymized export
        console.log('🔒 Step 6: Creating anonymized export...');
        const anonymizedJson = JSON.stringify({
            appliance: {
                brand: appliance.brand,
                model: appliance.modelName,
                type: appliance.applianceTypeName,
                series: appliance.series,
                connectivity: appliance.connectivity,
                status: appliance.applianceStatus,
                enrollmentDate: appliance.enrollmentDate,
                serialNumber: '[ANONYMIZED]',
                code: '[ANONYMIZED]'
            },
            metadata: {
                exportedAt: new Date().toISOString(),
                anonymized: true,
                sensitive_data_removed: ['serialNumber', 'code', 'MAC address', 'coordinates']
            }
        }, null, 2);
        
        const anonFile = './diagnostics/appliance_diagnostic_anonymous.json';
        await fs.writeFile(anonFile, anonymizedJson, 'utf-8');
        
        console.log(`✅ Anonymized export saved to: ${anonFile}`);
        console.log(`   File size: ${diagnostics.formatBytes(anonymizedJson.length)}`);
        console.log('   Sensitive data (serial, code, MAC) anonymized');
        console.log();

        // Step 7-9: Simplified (data structure doesn't support commands/rules yet)
        console.log('⚙️  Step 7: Command Structure...');
        console.log(`ℹ️  Note: Commands/rules require appliance-specific initialization`);
        console.log(`   (Available: ${appliances.length} appliances loaded)`);
        console.log();

        // Step 10: Statistics
        console.log('📈 Step 8: Export Summary');
        console.log('─'.repeat(60));
        console.log(`Total appliances:        ${appliances.length}`);
        console.log(`Brand:                   ${appliance.brand}`);
        console.log(`Model:                   ${appliance.modelName}`);
        console.log(`Type:                    ${appliance.applianceTypeName}`);
        console.log(`Connectivity:            ${appliance.connectivity}`);
        console.log(`Status:                  ${appliance.applianceStatus}`);
        console.log(`JSON export size:        ${diagnostics.formatBytes(jsonContent.length)}`);
        console.log(`Anonymized JSON size:    ${diagnostics.formatBytes(anonymizedJson.length)}`);
        console.log('─'.repeat(60));
        console.log();

        console.log('✅ All exports completed successfully!');
        console.log();
        console.log('Generated files:');
        console.log('  • ./diagnostics/appliance_diagnostic.json');
        console.log('  • ./diagnostics/appliance_diagnostic_anonymous.json');
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
