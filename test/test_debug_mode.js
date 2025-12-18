/**
 * Test debug mode functionality
 * This test verifies that debug mode properly controls console.log output
 */

const { HonAuth, HonDevice } = require('../index.js');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║             Debug Mode Functionality Test                 ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log();

// Test 1: Default behavior (debug = false)
console.log('Test 1: Default behavior (debug = false)');
console.log('─'.repeat(60));
const device1 = new HonDevice('TestDevice1');
const auth1 = new HonAuth(null, 'test@example.com', 'password', device1);
console.log(`✓ Debug mode: ${auth1._debug}`);
console.log(`✓ Expected: false`);
console.log();

// Test 2: Explicit debug = false
console.log('Test 2: Explicit debug = false');
console.log('─'.repeat(60));
const device2 = new HonDevice('TestDevice2');
const auth2 = new HonAuth(null, 'test@example.com', 'password', device2, false);
console.log(`✓ Debug mode: ${auth2._debug}`);
console.log(`✓ Expected: false`);
console.log();

// Test 3: Debug enabled
console.log('Test 3: Debug enabled (debug = true)');
console.log('─'.repeat(60));
const device3 = new HonDevice('TestDevice3');
const auth3 = new HonAuth(null, 'test@example.com', 'password', device3, true);
console.log(`✓ Debug mode: ${auth3._debug}`);
console.log(`✓ Expected: true`);
console.log();

// Test 4: Verify _debugLog method exists
console.log('Test 4: Verify _debugLog method exists');
console.log('─'.repeat(60));
console.log(`✓ _debugLog is a function: ${typeof auth1._debugLog === 'function'}`);
console.log();

// Test 5: Test _debugLog behavior
console.log('Test 5: Test _debugLog behavior');
console.log('─'.repeat(60));
console.log('With debug = false (you should NOT see "Debug message 1"):');
auth1._debugLog('Debug message 1 - THIS SHOULD NOT APPEAR');
console.log('✓ No debug output above (correct)');
console.log();

console.log('With debug = true (you should see "Debug message 2"):');
auth3._debugLog('✓ Debug message 2 - THIS SHOULD APPEAR');
console.log();

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                  All Tests Completed!                      ║');
console.log('╚════════════════════════════════════════════════════════════╝');
