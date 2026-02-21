/**
 * Test script for WashingMachine refactoring
 * Tests the new methods in WashingMachine class
 */

const { HonParameterProgram } = require('../index');
const WashingMachine = require('../lib/appliances/types/wm');

console.log('🧪 Testing JavahOn WashingMachine Refactoring\n');

// Test 1: Static constants
console.log('✅ Test 1: Static constants');
console.log('MACHINE_STATES:', WashingMachine.MACHINE_STATES);
console.log('  Note: machMode 0 and 1 both map to "ready" (matching hOn app behavior)');
console.log('WASH_PHASES:', WashingMachine.WASH_PHASES);
console.log();

// Test 2: formatProgramName static method
console.log('✅ Test 2: HonParameterProgram.formatProgramName()');
const testCases = [
  'IOT_WASH_COTTON',
  'SPECIAL_49',
  'RAPID_14_MIN',
  'COTTON_60',
  'SYNTHETICS',
  'ECO_40_60'
];

testCases.forEach(test => {
  const formatted = HonParameterProgram.formatProgramName(test);
  console.log(`  "${test}" -> "${formatted}"`);
});
console.log();

// Test 3: Mock appliance to test instance methods
console.log('✅ Test 3: WashingMachine instance methods');

// Create a mock parent appliance
const mockParent = {
  attributes: {
    parameters: {
      machMode: { value: '2' },
      prPhase: { value: '2' },
      prCode: { value: '9' },
      prPosition: { value: '2' }
    }
  },
  commands: {
    startProgram: {
      categories: {
        'COTTON': {
          parameters: {
            prCode: { value: '1' },
            prPosition: { value: '0' }
          }
        },
        'SPECIAL_49': {
          parameters: {
            prCode: { value: '9' },
            prPosition: { value: '2' },
            temp: { value: '30' },
            spinSpeed: { value: '600' },
            favourite: { value: '0' }
          }
        },
        'Mio Cotone Preferito': {
          // Custom favourite: same prCode/prPosition as SPECIAL_49, different temp/spinSpeed
          parameters: {
            prCode: { value: '9' },
            prPosition: { value: '2' },
            temp: { value: '60' },
            spinSpeed: { value: '1000' },
            favourite: { value: '1' }
          }
        }
      },
      parameters: {
        temp: {
          values: ['20', '30', '40', '60', '90']
        },
        spinSpeed: {
          values: ['0', '800', '1000', '1200', '1400']
        }
      }
    }
  }
};

const wm = new WashingMachine();
wm.parent = mockParent;

console.log('  getStateKey() [from appliance]:', wm.getStateKey());
console.log('  getStateKey(5) [explicit]:', wm.getStateKey('5'));
// getStateDisplay() removed - method no longer exists
console.log('  getWashPhaseKey() [from appliance]:', wm.getWashPhaseKey());
console.log('  getWashPhaseKey(11) [explicit]:', wm.getWashPhaseKey('11'));
// getWashPhaseDisplay() removed - method no longer exists
console.log();

console.log('  getAvailablePrograms():', wm.getAvailablePrograms());
console.log('  getAvailableTemperatures():', wm.getAvailableTemperatures());
console.log('  getAvailableSpinSpeeds():', wm.getAvailableSpinSpeeds());
console.log();

// Test custom favourite disambiguation
console.log('  findProgramByCode(9, 2) [no temp/spin]:', wm.findProgramByCode(9, 2));
console.log('  findProgramByCode(9, 2, null, 60, 1000) [custom fav temp]:', wm.findProgramByCode(9, 2, null, 60, 1000));
console.log('  findProgramByCode(9, 2, null, 30, 600) [base prog temp]:', wm.findProgramByCode(9, 2, null, 30, 600));
console.log('  findProgramByCode(1, 0):', wm.findProgramByCode(1, 0));
console.log('  getProgramInfo():', wm.getProgramInfo());
console.log();

console.log('✅ Test 4: Remote Control Validation');
console.log('  isRemoteControlEnabled():', wm.isRemoteControlEnabled());

// Test with remoteCtrValid = 1 (enabled)
mockParent.attributes.parameters.remoteCtrValid = { value: '1' };
console.log('  With remoteCtrValid=1:', wm.isRemoteControlEnabled());

try {
  wm.validateRemoteControl('testCommand');
  console.log('  validateRemoteControl() - ✅ Passed (no error thrown)');
} catch (error) {
  console.log('  validateRemoteControl() - ❌ Failed:', error.message);
}

// Test with remoteCtrValid = 0 (disabled)
mockParent.attributes.parameters.remoteCtrValid = { value: '0' };
console.log('  With remoteCtrValid=0:', wm.isRemoteControlEnabled());

try {
  wm.validateRemoteControl('testCommand');
  console.log('  validateRemoteControl() - ❌ Should have thrown error');
} catch (error) {
  console.log('  validateRemoteControl() - ✅ Correctly threw error:', error.message);
}
console.log();

console.log('🎉 All tests completed!');
