/**
 * Washing Machine Events Example
 * 
 * Demonstrates how to use event-driven functionality to monitor
 * washing machine state changes in real-time.
 * 
 * Events emitted by WashingMachine:
 * - programStarted: When a wash program begins
 * - programFinished: When a wash program completes
 * - phaseChanged: When the program moves to a different phase (wash → rinse → spin)
 * - stateChanged: When machine state changes (any transition)
 */

const { HonAuth, HonAPI, MQTTClient, HonDevice } = require('../index');

// Configuration
const EMAIL = process.env.HON_EMAIL || 'your.email@example.com';
const PASSWORD = process.env.HON_PASSWORD || 'your_password';

async function main() {
  console.log('=== Washing Machine Events Example ===\n');

  try {
    // 1. Authenticate
    console.log('🔐 Authenticating...');
    const device = new HonDevice('JavahOn-Events-Example');
    const auth = new HonAuth(null, EMAIL, PASSWORD, device, false);
    await auth.authenticate();
    console.log('✅ Authentication successful\n');

    // 2. Load appliances
    const api = new HonAPI(auth);
    const appliances = await api.loadAppliances();
    
    // 3. Find washing machine
    const washingMachine = appliances.find(a => a.applianceType === 'WM');
    if (!washingMachine) {
      console.log('❌ No washing machine found in your account');
      return;
    }

    console.log(`📍 Found washing machine: ${washingMachine.nickName}`);
    console.log(`   MAC: ${washingMachine.macAddress}\n`);

    // 4. Setup event listeners BEFORE starting MQTT
    const wm = washingMachine.extra;

    wm.on('programStarted', (event) => {
      console.log('\n🟢 PROGRAM STARTED');
      console.log(`   Program: ${event.program || 'Unknown'}`);
      console.log(`   Machine Mode: ${event.machMode}`);
      console.log(`   Phase: ${event.prPhase} (${wm.getWashPhaseKey(event.prPhase)})`);
      console.log(`   Time: ${new Date(event.timestamp).toLocaleTimeString()}`);
    });

    wm.on('programFinished', (event) => {
      console.log('\n🏁 PROGRAM FINISHED');
      console.log(`   Program: ${event.program || 'Unknown'}`);
      console.log(`   Final Mode: ${event.machMode}`);
      console.log(`   Final Phase: ${event.prPhase}`);
      console.log(`   Time: ${new Date(event.timestamp).toLocaleTimeString()}`);
    });

    wm.on('phaseChanged', (event) => {
      console.log('\n📊 PHASE CHANGED');
      console.log(`   From: ${event.from} (${event.fromKey})`);
      console.log(`   To: ${event.to} (${event.toKey})`);
      console.log(`   Program: ${event.program || 'Unknown'}`);
      console.log(`   Time: ${new Date(event.timestamp).toLocaleTimeString()}`);
    });

    wm.on('stateChanged', (event) => {
      console.log('\n🔄 STATE CHANGED');
      console.log(`   From: ${event.from} (${event.fromKey})`);
      console.log(`   To: ${event.to} (${event.toKey})`);
      console.log(`   Phase: ${event.prPhase}`);
      console.log(`   Time: ${new Date(event.timestamp).toLocaleTimeString()}`);
    });

    // 5. Start MQTT client
    console.log('🔌 Starting MQTT client...');
    const mqttClient = await api.startMqttClient(appliances);
    console.log('✅ MQTT client connected\n');

    // 6. Setup MQTT message handler
    mqttClient.on('applianceUpdate', ({ appliance, payload }) => {
      if (appliance.macAddress === washingMachine.macAddress) {
        // Update washing machine state and trigger events
        if (payload.parameters) {
          wm.updateState(payload.parameters);
        }
      }
    });

    console.log('👀 Listening for washing machine events...');
    console.log('   Press Ctrl+C to stop\n');

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n\n⏹️  Stopping...');
      mqttClient.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run example
if (require.main === module) {
  main();
}

module.exports = main;
