/**
 * MODE SYSTEM TEST
 * ================
 * Simple test to verify the mode system works correctly.
 * Run with: node test-mode-system.js
 */

// Load modules
const BrailleMode = require('./modes/BrailleMode.js');
const { ModeRegistry } = require('./modes/ModeRegistry.js');
const UEBGrade1Mode = require('./modes/ueb/UEBGrade1Mode.js');
const EditorState = require('./core/EditorState.js');

console.log('=== Mode System Test ===\n');

// Test 1: Create mode registry
console.log('Test 1: Create ModeRegistry');
const registry = new ModeRegistry();
console.log('  ✓ ModeRegistry created');

// Test 2: Register UEB Grade 1 mode
console.log('\nTest 2: Register UEB Grade 1 mode');
const ueb1 = new UEBGrade1Mode();
registry.register(ueb1);
console.log(`  ✓ Registered: ${ueb1.name} (${ueb1.id})`);

// Test 3: Set mode
console.log('\nTest 3: Set current mode');
registry.setMode('ueb1');
console.log(`  ✓ Current mode: ${registry.getMode().name}`);

// Test 4: Create editor state
console.log('\nTest 4: Create EditorState');
const state = new EditorState(registry.getMode());
console.log('  ✓ EditorState created');

// Test 5: Test code to text conversion
console.log('\nTest 5: Code to text conversion');
const mode = registry.getMode();
const tests = [
  { code: 0x01, expected: 'a' },
  { code: 0x03, expected: 'b' },
  { code: 0x09, expected: 'c' },
  { code: 0x3c, expected: '⠼' },  // Number sign
];

tests.forEach(test => {
  const result = mode.codeToText(test.code, { state: state.modeState });
  const status = result === test.expected ? '✓' : '✗';
  console.log(`  ${status} Code ${test.code} → "${result}" (expected: "${test.expected}")`);
});

// Test 6: Test number mode
console.log('\nTest 6: Number mode');
state.modeState.numberMode = true;
const numTests = [
  { code: 0x01, expected: '1' },
  { code: 0x03, expected: '2' },
  { code: 0x1a, expected: '0' },
];

numTests.forEach(test => {
  const result = mode.codeToText(test.code, { state: state.modeState });
  const status = result === test.expected ? '✓' : '✗';
  console.log(`  ${status} Code ${test.code} in number mode → "${result}" (expected: "${test.expected}")`);
});

// Test 7: Test capital mode
console.log('\nTest 7: Capital mode');
state.modeState.numberMode = false;
state.modeState.capitalMode = 1;
const capResult = mode.codeToText(0x01, { state: state.modeState });
const capStatus = capResult === 'A' ? '✓' : '✗';
console.log(`  ${capStatus} Code 0x01 with capital mode → "${capResult}" (expected: "A")`);

// Test 8: Test dots to code conversion
console.log('\nTest 8: Dots to code conversion');
const dotsTests = [
  { dots: [1], expected: 0x01 },
  { dots: [1, 2], expected: 0x03 },
  { dots: [1, 4], expected: 0x09 },
  { dots: [3, 4, 5, 6], expected: 0x3c },
];

dotsTests.forEach(test => {
  const result = mode.dotsToCode(test.dots);
  const status = result === test.expected ? '✓' : '✗';
  console.log(`  ${status} Dots [${test.dots}] → code ${result} (expected: ${test.expected})`);
});

// Test 9: Test prefix codes
console.log('\nTest 9: Prefix codes');
const prefixCodes = mode.getPrefixCodes();
console.log(`  Prefix codes count: ${prefixCodes.size}`);
console.log(`  Has 0x28 (italic prefix): ${prefixCodes.has(0x28) ? '✓' : '✗'}`);
console.log(`  Has 0x18 (bold prefix): ${prefixCodes.has(0x18) ? '✓' : '✗'}`);
console.log(`  Has 0x38 (underline prefix): ${prefixCodes.has(0x38) ? '✓' : '✗'}`);

// Test 10: Test sequence resolution
console.log('\nTest 10: Sequence resolution');
const seqResult = mode.resolveSequence(0x28, 0x06, {});
if (seqResult) {
  console.log(`  ✓ Italic symbol sequence: ${seqResult.name} → "${seqResult.text}"`);
} else {
  console.log('  ✗ Failed to resolve italic symbol sequence');
}

console.log('\n=== All Tests Complete ===');
