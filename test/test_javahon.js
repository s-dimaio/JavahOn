/**
 * JavahOn Library Tests
 * Comprehensive tests for core library functionality
 */

const { 
  HonAuth, 
  HonDevice, 
  HonAPI, 
  constants, 
  crypto,
  HonAuthenticationError,
  HonNoAuthenticationNeeded,
  NoSessionException,
  NoAuthenticationException,
  ApiError
} = require('../index.js');

console.log('\n========================================');
console.log('JAVAHON LIBRARY TESTS');
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

function assertMatch(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(message || `Expected ${actual} to match ${pattern}`);
  }
}

// ========================================
// Constants Tests
// ========================================
console.log('--- Constants ---');

test('should have all required constants', () => {
  assertEqual(constants.AUTH_API, 'https://account2.hon-smarthome.com');
  assertEqual(constants.API_URL, 'https://api-iot.he.services');
  assert(constants.CLIENT_ID, 'CLIENT_ID should be defined');
  assertEqual(constants.APP_VERSION, '2.6.5');
  assertEqual(constants.OS, 'android');
  assertEqual(constants.DEVICE_MODEL, 'JavahOn');
});

// ========================================
// Crypto Utilities Tests
// ========================================
console.log('\n--- Crypto Utilities ---');

test('should generate valid nonce', () => {
  const nonce = crypto.generateNonce();
  assertMatch(nonce, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
});

test('should generate random hex', () => {
  const hex = crypto.randomHex(16);
  assertEqual(hex.length, 32, '16 bytes should produce 32 hex chars');
  assertMatch(hex, /^[a-f0-9]{32}$/);
});

test('should hash passwords', () => {
  const password = 'testpassword';
  const hash = crypto.hashPassword(password);
  assertEqual(hash.length, 64, 'SHA256 hex should be 64 chars');
  assert(crypto.verifyPassword(password, hash), 'Should verify correct password');
  assert(!crypto.verifyPassword('wrongpassword', hash), 'Should reject wrong password');
});

// ========================================
// HonDevice Tests
// ========================================
console.log('\n--- HonDevice ---');

test('should create device with default mobile ID', () => {
  const device = new HonDevice();
  assertEqual(device.mobileId, 'JavahOn');
  assertEqual(device.appVersion, '2.6.5');
  assertEqual(device.osType, 'android');
  assertEqual(device.deviceModel, 'JavahOn');
});

test('should create device with custom mobile ID', () => {
  const device = new HonDevice('CustomDevice');
  assertEqual(device.mobileId, 'CustomDevice');
});

test('should return correct device info', () => {
  const device = new HonDevice('TestDevice');
  const info = device.get();
  
  assertEqual(info.appVersion, '2.6.5');
  assertEqual(info.mobileId, 'TestDevice');
  assertEqual(info.os, 'android');
  assertEqual(info.osVersion, 999);
  assertEqual(info.deviceModel, 'JavahOn');
});

test('should return mobile format device info', () => {
  const device = new HonDevice('TestDevice');
  const info = device.get(true);
  
  assertEqual(info.appVersion, '2.6.5');
  assertEqual(info.mobileId, 'TestDevice');
  assertEqual(info.mobileOs, 'android');
  assertEqual(info.osVersion, 999);
  assertEqual(info.deviceModel, 'JavahOn');
  assert(info.os === undefined, 'os should be undefined in mobile format');
});

// ========================================
// HonAuth Tests
// ========================================
console.log('\n--- HonAuth ---');

test('should create authentication instance', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device);
  
  assertEqual(auth._loginData.email, 'test@example.com');
  assertEqual(auth._loginData.password, 'password');
  assertEqual(auth._device, device);
  assertEqual(auth._debug, false);  // Default debug should be false
});

test('should create authentication instance with debug enabled', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device, true);
  
  assertEqual(auth._debug, true);
});

test('should create authentication instance with debug disabled explicitly', () => {
  const device = new HonDevice('TestDevice');
  const auth = new HonAuth(null, 'test@example.com', 'password', device, false);
  
  assertEqual(auth._debug, false);
});

test('should check token expiration', () => {
  const device = new HonDevice();
  const auth = new HonAuth(null, 'test@example.com', 'password', device);
  
  // Token should not be expired by default (just created)
  assertEqual(auth.tokenIsExpired, false);
  assertEqual(auth.tokenExpiresSoon, false);
});

test('should generate nonce', () => {
  const nonce = HonAuth._generateNonce();
  assertMatch(nonce, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
});

// ========================================
// HonAPI Tests
// ========================================
console.log('\n--- HonAPI ---');

test('should create API client', () => {
  const api = new HonAPI({
    email: 'test@example.com',
    password: 'password',
    anonymous: true
  });
  
  assertEqual(api._email, 'test@example.com');
  assertEqual(api._password, 'password');
  assertEqual(api._anonymous, true);
});

test('should generate transaction ID', () => {
  const api = new HonAPI({ anonymous: true });
  const transactionId = api._generateTransactionId();
  
  assertMatch(transactionId, /^\d{13}-[a-z0-9]{9}$/);
});

// ========================================
// Exceptions Tests
// ========================================
console.log('\n--- Exceptions ---');

test('should create HonAuthenticationError', () => {
  const error = new HonAuthenticationError('Test error');
  assertEqual(error.name, 'HonAuthenticationError');
  assertEqual(error.message, 'Test error');
  assert(error instanceof Error, 'Should be instance of Error');
});

test('should create HonNoAuthenticationNeeded', () => {
  const error = new HonNoAuthenticationNeeded();
  assertEqual(error.name, 'HonNoAuthenticationNeeded');
  assertEqual(error.message, 'No authentication needed - already authenticated');
});

test('should create other exceptions', () => {
  const noSession = new NoSessionException();
  const noAuth = new NoAuthenticationException();
  const apiError = new ApiError();
  
  assertEqual(noSession.name, 'NoSessionException');
  assertEqual(noAuth.name, 'NoAuthenticationException');
  assertEqual(apiError.name, 'ApiError');
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
