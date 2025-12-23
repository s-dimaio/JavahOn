/**
 * Test Washing Machine Events
 * 
 * Tests the event-driven functionality of WashingMachine class
 * Verifies that state transitions emit correct events
 */

const { WashingMachine } = require('../index');

// Mock appliance data
const mockAppliance = {
  appliance: {
    applianceTypeName: 'WM',
    macAddress: 'test:mac:address'
  },
  commands: {
    startProgram: {
      categories: {
        'cottons': {
          parameters: {
            prCode: { value: '1' },
            prPosition: { value: '14' }
          }
        }
      }
    }
  },
  attributes: {
    parameters: {
      machMode: { value: '0' },
      prPhase: { value: '0' }
    }
  }
};

console.log('=== Testing Washing Machine Events ===\n');

// Create washing machine instance
const wm = new WashingMachine(mockAppliance);

// Event counters
let eventsEmitted = {
  programStarted: 0,
  programFinished: 0,
  phaseChanged: 0,
  stateChanged: 0
};

// Setup event listeners
wm.on('programStarted', (event) => {
  eventsEmitted.programStarted++;
  console.log('✅ programStarted:', {
    machMode: event.machMode,
    prPhase: event.prPhase,
    program: event.program
  });
});

wm.on('programFinished', (event) => {
  eventsEmitted.programFinished++;
  console.log('✅ programFinished:', {
    machMode: event.machMode,
    prPhase: event.prPhase,
    program: event.program
  });
});

wm.on('phaseChanged', (event) => {
  eventsEmitted.phaseChanged++;
  console.log('✅ phaseChanged:', {
    from: `${event.from} (${event.fromKey})`,
    to: `${event.to} (${event.toKey})`,
    program: event.program
  });
});

wm.on('stateChanged', (event) => {
  eventsEmitted.stateChanged++;
  console.log('✅ stateChanged:', {
    from: `${event.from} (${event.fromKey})`,
    to: `${event.to} (${event.toKey})`,
    prPhase: event.prPhase
  });
});

console.log('--- Test 1: Program Start (Ready → Running) ---');
wm.updateState({
  machMode: { value: '2' },
  prPhase: { value: '2' },
  prStr: { value: 'cottons' }
});

console.log('\n--- Test 2: Phase Change (Washing → Rinse) ---');
wm.updateState({
  machMode: { value: '2' },
  prPhase: { value: '3' },
  prStr: { value: 'cottons' }
});

console.log('\n--- Test 3: Another Phase Change (Rinse → Spin) ---');
wm.updateState({
  machMode: { value: '2' },
  prPhase: { value: '11' },
  prStr: { value: 'cottons' }
});

console.log('\n--- Test 4: Program Finish (Running → Ready) ---');
wm.updateState({
  machMode: { value: '0' },
  prPhase: { value: '0' },
  prStr: { value: 'cottons' }
});

console.log('\n--- Test 5: Paused State ---');
wm.updateState({
  machMode: { value: '2' },
  prPhase: { value: '2' },
  prStr: { value: 'delicate' }
});

wm.updateState({
  machMode: { value: '3' },
  prPhase: { value: '2' },
  prStr: { value: 'delicate' }
});

console.log('\n=== Event Summary ===');
console.log(`programStarted events: ${eventsEmitted.programStarted}`);
console.log(`programFinished events: ${eventsEmitted.programFinished}`);
console.log(`phaseChanged events: ${eventsEmitted.phaseChanged}`);
console.log(`stateChanged events: ${eventsEmitted.stateChanged}`);

// Verify counts
const expectedEvents = {
  programStarted: 2,    // Test 1 + Test 5
  programFinished: 2,   // Test 4 + Test 5 (pause counts as finish)
  phaseChanged: 3,      // Test 2 + Test 3 + Test 5 (0→2)
  stateChanged: 3       // Test 4, Test 5 start, Test 5 pause
};

console.log('\n=== Verification ===');
let allPassed = true;

Object.keys(expectedEvents).forEach(eventName => {
  const expected = expectedEvents[eventName];
  const actual = eventsEmitted[eventName];
  const passed = expected === actual;
  allPassed = allPassed && passed;
  
  console.log(`${passed ? '✅' : '❌'} ${eventName}: expected ${expected}, got ${actual}`);
});

console.log(`\n${allPassed ? '✅ All tests PASSED' : '❌ Some tests FAILED'}`);
process.exit(allPassed ? 0 : 1);
