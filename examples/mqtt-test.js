/**
 * MQTT Real-time Communication Example
 * Demonstrates connecting to AWS IoT Core and receiving real-time appliance updates
 */

const { HonAuth, HonAPI, HonDevice, MQTTClient } = require('..');
const readline = require('readline');

// Setup readline for interactive input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
    console.log('\n=== hOn MQTT Real-time Communication ===\n');

    try {
        // Get credentials
        const email = await question('Email: ');
        const password = await question('Password: ');

        console.log('\n1. Authenticating...');
        const device = new HonDevice('MQTT-Test');
        const auth = new HonAuth(null, email, password, device);
        await auth.authenticate();
        console.log('✓ Authentication successful');

        console.log('\n2. Creating API client...');
        const api = new HonAPI(auth);
        console.log('✓ API client ready');

        console.log('\n3. Loading appliances...');
        const appliances = await api.loadAppliances();
        console.log(`✓ Found ${appliances.length} appliance(s)`);

        if (appliances.length === 0) {
            console.log('\nNo appliances found. Cannot demonstrate MQTT functionality.');
            rl.close();
            return;
        }

        // Display appliances
        console.log('\nAppliances:');
        appliances.forEach((appliance, index) => {
            console.log(`  ${index + 1}. ${appliance.typeName || 'Unknown'} (${appliance.modelName || 'Unknown'})`);
            console.log(`     MAC: ${appliance.macAddress || 'Unknown'}`);
            console.log(`     Connected: ${appliance.connection}`);
            const topics = appliance.info?.topics?.subscribe || [];
            console.log(`     Topics: ${topics.length}`);
            if (topics.length > 0) {
                topics.forEach(topic => console.log(`       - ${topic}`));
            }
        });

        // Check if any appliance has MQTT topics
        const hasTopics = appliances.some(a => (a.info?.topics?.subscribe || []).length > 0);
        if (!hasTopics) {
            console.log('\n⚠️  Warning: No appliances have MQTT topics configured.');
            console.log('    This might be because:');
            console.log('    - Appliances are virtual/demo devices');
            console.log('    - Appliances don\'t support real-time updates');
            console.log('    - MQTT features not enabled for your account');
            console.log('\n    MQTT connection will be attempted anyway...\n');
        }

        console.log('\n4. Connecting to MQTT...');
        const mqttClient = await MQTTClient.create(api, appliances);
        console.log('✓ MQTT connected');

        // Setup event handlers
        mqttClient.on('applianceUpdate', ({ appliance, payload }) => {
            console.log(`\n📡 [${appliance.typeName}] Status Update:`);
            if (payload.parameters) {
                for (const [key, value] of Object.entries(payload.parameters)) {
                    console.log(`   ${key}: ${value}`);
                }
            }
        });

        mqttClient.on('connectionChange', ({ appliance, connected }) => {
            const status = connected ? '🟢 CONNECTED' : '🔴 DISCONNECTED';
            console.log(`\n${status} [${appliance.typeName}]`);
        });

        mqttClient.on('discovery', ({ topic, payload }) => {
            console.log(`\n🔍 Discovery: ${topic}`);
            console.log(JSON.stringify(payload, null, 2));
        });

        mqttClient.on('error', (error) => {
            console.error(`\n❌ MQTT Error: ${error.message}`);
        });

        mqttClient.on('disconnected', () => {
            console.log('\n⚠️ MQTT disconnected');
        });

        mqttClient.on('reconnecting', () => {
            console.log('\n🔄 MQTT reconnecting...');
        });

        console.log('\n✓ Monitoring real-time updates...');
        console.log('   (Watchdog enabled: auto-reconnect every 5 seconds)');
        console.log('\nListening for messages... Press Ctrl+C to exit\n');

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n\nShutting down...');
            await mqttClient.disconnect();
            rl.close();
            process.exit(0);
        });

        // Keep the process running
        await new Promise(() => {});

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        rl.close();
        process.exit(1);
    }
}

// Run the example
main();
