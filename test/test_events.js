/**
 * Event System Tests
 * Tests event emission for token management
 */

const { HonAuth } = require('../index');
const EventEmitter = require('events');

console.log('\n========================================');
console.log('EVENT SYSTEM TESTS');
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
// Basic Event Functionality
// ========================================
console.log('--- Basic Event Functionality ---');

test('HonAuth should extend EventEmitter', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  assert(auth instanceof EventEmitter, 'HonAuth should be instance of EventEmitter');
});

test('should allow registering event listeners', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  let called = false;
  const listener = () => { called = true; };
  
  auth.on('tokens', listener);
  
  assertEqual(auth.listenerCount('tokens'), 1, 'Should have 1 listener');
});

test('should emit events to registered listeners', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  let called = false;
  let receivedData = null;
  
  auth.on('tokens', (data) => { 
    called = true; 
    receivedData = data;
  });
  
  auth.emit('tokens', { test: true });
  
  assert(called, 'Listener should have been called');
  assert(receivedData && receivedData.test === true, 'Should receive correct data');
});

test('should emit tokens with correct data structure', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  let receivedTokens = null;
  
  auth.on('tokens', (tokens) => {
    receivedTokens = tokens;
  });

  const mockTokens = {
    accessToken: 'access123',
    idToken: 'id123',
    refreshToken: 'refresh123',
    cognitoToken: 'cognito123',
    expiresAt: new Date().toISOString(),
    expiresIn: 86400
  };

  auth.emit('tokens', mockTokens);

  assert(receivedTokens !== null, 'Should receive tokens');
  assert('accessToken' in receivedTokens, 'Should have accessToken');
  assert('idToken' in receivedTokens, 'Should have idToken');
  assert('refreshToken' in receivedTokens, 'Should have refreshToken');
  assert('cognitoToken' in receivedTokens, 'Should have cognitoToken');
  assert('expiresAt' in receivedTokens, 'Should have expiresAt');
  assert('expiresIn' in receivedTokens, 'Should have expiresIn');
});

test('should support multiple listeners', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  let called1 = false;
  let called2 = false;

  auth.on('tokens', () => { called1 = true; });
  auth.on('tokens', () => { called2 = true; });

  auth.emit('tokens', { test: true });

  assert(called1, 'First listener should be called');
  assert(called2, 'Second listener should be called');
});

test('should allow removing all listeners', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  
  auth.on('tokens', () => {});
  auth.on('tokens', () => {});
  assertEqual(auth.listenerCount('tokens'), 2, 'Should have 2 listeners');

  auth.removeAllListeners('tokens');
  assertEqual(auth.listenerCount('tokens'), 0, 'Should have 0 listeners after removal');
});

test('should have _emitTokens method', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  assert(typeof auth._emitTokens === 'function', '_emitTokens should be a function');
});

// ========================================
// Token Event Integration
// ========================================
console.log('\n--- Token Event Integration ---');

test('setTokens should emit tokens event when successful', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  let eventEmitted = false;
  
  auth.on('tokens', () => { eventEmitted = true; });

  const validTokens = {
    accessToken: 'access123',
    idToken: 'id123',
    refreshToken: 'refresh123',
    cognitoToken: 'cognito123',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    expiresIn: 3600
  };

  const result = auth.setTokens(validTokens);
  
  assert(result === true, 'setTokens should return true');
  assert(eventEmitted, 'tokens event should be emitted');
});

test('setTokens should not emit event when tokens are invalid', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  let eventEmitted = false;
  
  auth.on('tokens', () => { eventEmitted = true; });

  const invalidTokens = {
    accessToken: 'access123'
  };

  const result = auth.setTokens(invalidTokens);
  
  assert(result === false, 'setTokens should return false for invalid tokens');
  assert(!eventEmitted, 'tokens event should not be emitted for invalid tokens');
});

test('_emitTokens should emit with complete token data', () => {
  const auth = new HonAuth(null, 'test@example.com', 'password');
  let receivedTokens = null;
  
  auth.on('tokens', (tokens) => { receivedTokens = tokens; });

  const validTokens = {
    accessToken: 'access123',
    idToken: 'id123',
    refreshToken: 'refresh123',
    cognitoToken: 'cognito123',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    expiresIn: 3600
  };

  auth.setTokens(validTokens);
  auth._emitTokens();
  
  assert(receivedTokens !== null, 'Should receive tokens from _emitTokens');
  assertEqual(receivedTokens.accessToken, 'access123', 'Should have correct accessToken');
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
