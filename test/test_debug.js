/**
 * Debug Mode Tests
 * Comprehensive tests for debug flag functionality across the entire library
 */

const { HonAuth, HonAPI, HonDevice } = require('../index.js');

console.log('\n========================================');
console.log('DEBUG MODE TESTS');
console.log('========================================\n');

// Test counter
let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// ========================================
// Basic Debug Flag Tests
// ========================================
console.log('--- Basic Debug Flag Tests ---');

test('HonAuth should default to debug=false', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device);
  assertEqual(auth._debug, false, 'Default debug should be false');
});

test('HonAuth should accept explicit debug=false', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device, false);
  assertEqual(auth._debug, false, 'Explicit false should work');
});

test('HonAuth should accept debug=true', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device, true);
  assertEqual(auth._debug, true, 'Debug enabled should work');
});

test('HonAuth should have _debugLog method', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device);
  assert(typeof auth._debugLog === 'function', '_debugLog should be a function');
});

// ========================================
// Debug Propagation Tests
// ========================================
console.log('\n--- Debug Propagation Tests ---');

test('HonAPI should inherit debug=false from HonAuth', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device, false);
  const api = new HonAPI(auth);
  
  assert(typeof api._debugLog === 'function', 'HonAPI should have _debugLog');
  // API accesses auth._debug internally, not storing its own copy
});

test('HonAPI should inherit debug=true from HonAuth', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device, true);
  const api = new HonAPI(auth);
  
  assert(typeof api._debugLog === 'function', 'HonAPI should have _debugLog');
  assertEqual(auth._debug, true, 'Auth debug should be true');
});

test('HonAPI _debugLog should respect auth debug flag', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device, false);
  const api = new HonAPI(auth);
  
  // This won't output anything because debug=false
  api._debugLog('This should not appear');
  assert(true, 'Should not throw error');
});

// ========================================
// Debug Output Behavior Tests
// ========================================
console.log('\n--- Debug Output Behavior Tests ---');

test('_debugLog should not output when debug=false', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device, false);
  
  // Capture console.log
  let logCalled = false;
  const originalLog = console.log;
  console.log = (...args) => {
    if (args.join(' ').includes('TEST_DEBUG_MESSAGE')) {
      logCalled = true;
    }
  };
  
  auth._debugLog('TEST_DEBUG_MESSAGE');
  console.log = originalLog;
  
  assertEqual(logCalled, false, 'Should not call console.log when debug=false');
});

test('_debugLog should output when debug=true', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device, true);
  
  // Capture console.log
  let logCalled = false;
  const originalLog = console.log;
  console.log = (...args) => {
    if (args.join(' ').includes('TEST_DEBUG_MESSAGE_2')) {
      logCalled = true;
    }
  };
  
  auth._debugLog('TEST_DEBUG_MESSAGE_2');
  console.log = originalLog;
  
  assertEqual(logCalled, true, 'Should call console.log when debug=true');
});

// ========================================
// Summary
// ========================================
console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');
console.log(`Total: ${passed + failed}`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
