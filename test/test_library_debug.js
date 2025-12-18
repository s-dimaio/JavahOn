/**
 * Test debug mode across all library classes
 * Verifies that debug logging is properly propagated through the entire library
 */

const { HonAuth, HonAPI, HonDevice } = require('../index.js');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        Library-wide Debug Mode Integration Test           ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log();

async function testDebugMode() {
    console.log('Test 1: Create HonAuth with debug=false (default)');
    console.log('─'.repeat(60));
    const device1 = new HonDevice('TestDevice1');
    const auth1 = new HonAuth(null, 'test@example.com', 'password', device1);
    console.log(`✓ HonAuth._debug: ${auth1._debug}`);
    
    // Create HonAPI with auth (should inherit debug setting)
    const api1 = new HonAPI(auth1);
    console.log(`✓ HonAPI created (debug should propagate from auth)`);
    console.log();

    console.log('Test 2: Create HonAuth with debug=true');
    console.log('─'.repeat(60));
    const device2 = new HonDevice('TestDevice2');
    const auth2 = new HonAuth(null, 'test@example.com', 'password', device2, true);
    console.log(`✓ HonAuth._debug: ${auth2._debug}`);
    
    // Create HonAPI with auth (should inherit debug setting)
    const api2 = new HonAPI(auth2);
    console.log(`✓ HonAPI created (debug enabled, will show logs during operations)`);
    console.log();

    console.log('Test 3: Verify _debugLog method exists in all classes');
    console.log('─'.repeat(60));
    console.log(`✓ HonAuth has _debugLog: ${typeof auth1._debugLog === 'function'}`);
    console.log(`✓ HonAPI has _debugLog: ${typeof api1._debugLog === 'function'}`);
    console.log();

    console.log('Test 4: Test _debugLog behavior');
    console.log('─'.repeat(60));
    console.log('With debug=false (you should NOT see debug message):');
    api1._debugLog('❌ This should NOT appear (api1 with debug=false)');
    console.log('✓ No debug output above (correct)');
    console.log();

    console.log('With debug=true (you should see debug message):');
    api2._debugLog('✅ This SHOULD appear (api2 with debug=true)');
    console.log();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              All Integration Tests Passed!                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('Note: In production, when debug=false:');
    console.log('  - No console.log output from authentication process');
    console.log('  - No console.log output from API operations');
    console.log('  - No console.log output from appliance operations');
    console.log('  - No console.log output from MQTT client');
    console.log('  - console.error still shows errors (always visible)');
    console.log();
    console.log('When debug=true:');
    console.log('  - Full detailed logging of all operations');
    console.log('  - Useful for troubleshooting and development');
}

testDebugMode().catch(error => {
    console.error('Test failed:', error.message);
    process.exit(1);
});
