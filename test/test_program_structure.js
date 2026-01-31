/**
 * Test to analyze program structure and identify all available parameters
 * This test loads washing machine commands and dumps the complete structure
 * of the first program category to understand what data is available.
 * 
 * Usage:
 *   node test/test_program_structure.js <email> <password>
 * 
 * Output: test/output/program_structure_analysis.json
 */

const { HonAuth, HonAPI, HonAppliance, HonDevice } = require('../index');
const fs = require('fs');
const path = require('path');

function safeSerialize(obj, seen = new WeakSet(), depth = 3) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (seen.has(obj) || depth === 0) return '[Circular]';
  seen.add(obj);

  const out = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'function') continue;
    out[key] = safeSerialize(val, seen, depth - 1);
  }
  return out;
}

async function analyzeProgramStructure() {
  try {
    // Get credentials from command line
    const email = process.argv[2] || process.env.HON_EMAIL;
    const password = process.argv[3] || process.env.HON_PASSWORD;

    if (!email || !password) {
      console.error('Usage: node test/test_program_structure.js <email> <password>');
      process.exit(1);
    }

    const device = new HonDevice('ProgramStructureTest');
    const api = new HonAPI({
      email: email,
      password: password,
      mobileId: device.mobileId
    });
    await api.create();
    const appliances = await api.loadAppliances();

    // Find washing machine
    const wmData = appliances.find(a =>
      a.applianceType === 'WM' ||
      a.applianceTypeName === 'WM' ||
      a.applianceTypeName?.toLowerCase().includes('wash')
    );
    if (!wmData) {
      console.error('No washing machine found');
      process.exit(1);
    }

    const appliance = new HonAppliance(api, wmData);
    await appliance.loadCommands();
    const startCmd = appliance.commands.startProgram;
    if (!startCmd || !startCmd.categories) {
      console.error('No startProgram command or categories found');
      process.exit(1);
    }

    // Build minimal array of programs
    const programs = [];
    for (const [id, category] of Object.entries(startCmd.categories)) {
      const parameters = category.parameters;
      const prCode = parameters?.prCode?.value;
      const prCode2 = parameters?.prCode?._attributes?.fixedValue; 
      const prPosition = parameters?.prPosition?.value;
      const programName = parameters?.program?.category;
      const remote = parameters?.remoteActionable?.value;
      const favourite = parameters?.favourite?.value;


      if (prCode === undefined || prCode === null) continue;
      // programs.push({
      //   id,
      //   parameters: safeSerialize(parameters, undefined, 3)
      // });
      programs.push({
        id,
        //prCode: parseInt(prCode),
        prCode: prCode2 !== undefined ? parseInt(prCode2) : null,
        prPosition: prPosition !== undefined ? parseInt(prPosition) : null,
        category: programName,
        remote: remote === '1' ? true : false,
        favourite: favourite === '1' ? true : false
      });
    }

    // Save to JSON
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'programs_minimal.json');
    fs.writeFileSync(outputPath, JSON.stringify(programs, null, 2));
    console.log(`Saved ${programs.length} programs to ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
analyzeProgramStructure();
