/**
 * Basic Tests - No credentials required
 * Tests core functionality without API calls
 */

const { HonAuth, HonAPI, HonDevice } = require('../index');
const { 
  HonAuthenticationError,
  HonNoAuthenticationNeeded,
  NoSessionException,
  NoAuthenticationException,
  ApiError
} = require('../index');
const crypto = require('../lib/utils/crypto');
const constants = require('../lib/config/constants');

console.log('\n========================================');
console.log('BASIC FUNCTIONALITY TESTS');
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
// Constants Tests
// ========================================
console.log('--- Constants ---');

test('API_URL should be defined', () => {
  assert(constants.API_URL, 'API_URL is not defined');
  assert(typeof constants.API_URL === 'string', 'API_URL should be a string');
});

test('AUTH_API should be defined', () => {
  assert(constants.AUTH_API, 'AUTH_API is not defined');
  assert(typeof constants.AUTH_API === 'string', 'AUTH_API should be a string');
});

test('CLIENT_ID should be defined', () => {
  assert(constants.CLIENT_ID, 'CLIENT_ID is not defined');
  assert(typeof constants.CLIENT_ID === 'string', 'CLIENT_ID should be a string');
});

test('APP_VERSION should be defined', () => {
  assert(constants.APP_VERSION, 'APP_VERSION is not defined');
  assertEqual(constants.APP_VERSION, '2.6.5', 'APP_VERSION should be 2.6.5');
});

// ========================================
// Crypto Utils Tests
// ========================================
console.log('\n--- Crypto Utils ---');

test('generateNonce should return valid UUID', () => {
  const nonce = crypto.generateNonce();
  assert(typeof nonce === 'string', 'Nonce should be a string');
  assert(nonce.match(/^[a-f0-9-]{36}$/), 'Should match UUID format');
});

test('randomHex should return hex string', () => {
  const hex = crypto.randomHex(16);
  assert(typeof hex === 'string', 'Hex should be a string');
  assertEqual(hex.length, 32, '16 bytes should produce 32 hex chars');
});

test('hashPassword should return SHA256 hash', () => {
  const hash = crypto.hashPassword('test');
  assert(typeof hash === 'string', 'Hash should be a string');
  assertEqual(hash.length, 64, 'SHA256 should be 64 chars');
});

// ========================================
// HonDevice Tests
// ========================================
console.log('\n--- HonDevice ---');

test('HonDevice should be instantiable', () => {
  const device = new HonDevice();
  assert(device instanceof HonDevice, 'Should create HonDevice instance');
});

test('HonDevice should have mobileId property', () => {
  const device = new HonDevice();
  assert('mobileId' in device, 'Should have mobileId property');
});

test('HonDevice should have appVersion property', () => {
  const device = new HonDevice();
  assert('appVersion' in device, 'Should have appVersion property');
});

// ========================================
// HonAuth Tests
// ========================================
console.log('\n--- HonAuth ---');

test('HonAuth should be instantiable', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  assert(auth instanceof HonAuth, 'Should create HonAuth instance');
});



// ========================================
// HonAPI Tests
// ========================================
console.log('\n--- HonAPI ---');

test('HonAPI should be instantiable', () => {
  const api = new HonAPI();
  assert(api instanceof HonAPI, 'Should create HonAPI instance');
});

test('HonAPI should have loadAppliances method', () => {
  const api = new HonAPI();
  assert(typeof api.loadAppliances === 'function', 'Should have loadAppliances method');
});

test('HonAPI should have sendCommand method', () => {
  const api = new HonAPI();
  assert(typeof api.sendCommand === 'function', 'Should have sendCommand method');
});

// ========================================
// Exception Classes Tests
// ========================================
console.log('\n--- Exception Classes ---');

test('HonAuthenticationError should be instantiable', () => {
  const error = new HonAuthenticationError('test');
  assert(error instanceof HonAuthenticationError, 'Should create HonAuthenticationError');
  assert(error instanceof Error, 'Should extend Error');
  assertEqual(error.message, 'test', 'Should have correct message');
});

test('HonNoAuthenticationNeeded should be instantiable', () => {
  const error = new HonNoAuthenticationNeeded();
  assert(error instanceof HonNoAuthenticationNeeded, 'Should create HonNoAuthenticationNeeded');
  assert(error instanceof Error, 'Should extend Error');
});

test('ApiError should be instantiable', () => {
  const error = new ApiError('test');
  assert(error instanceof ApiError, 'Should create ApiError');
  assert(error instanceof Error, 'Should extend Error');
});

test('NoSessionException should be instantiable', () => {
  const error = new NoSessionException('test');
  assert(error instanceof NoSessionException, 'Should create NoSessionException');
  assert(error instanceof Error, 'Should extend Error');
});

test('NoAuthenticationException should be instantiable', () => {
  const error = new NoAuthenticationException('test');
  assert(error instanceof NoAuthenticationException, 'Should create NoAuthenticationException');
  assert(error instanceof Error, 'Should extend Error');
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

process.exit(failed > 0 ? 1 : 0);
