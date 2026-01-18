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

async function analyzeProgramStructure() {
  console.log('🔍 Program Structure Analysis Test');
  console.log('═'.repeat(80));
  
  try {
    // Get credentials from command line
    const email = process.argv[2] || process.env.HON_EMAIL;
    const password = process.argv[3] || process.env.HON_PASSWORD;
    
    if (!email || !password) {
      console.error('❌ Usage: node test/test_program_structure.js <email> <password>');
      console.error('   Or set HON_EMAIL and HON_PASSWORD environment variables');
      process.exit(1);
    }
    
    // Create device
    console.log('📱 Creating device identity...');
    const device = new HonDevice('ProgramStructureTest');
    console.log(`✅ Device created: ${device.mobileId}`);
    
    // Initialize and authenticate API
    console.log('🔐 Authenticating...');
    const api = new HonAPI({
      email: email,
      password: password,
      mobileId: device.mobileId
    });
    
    await api.create();
    console.log('✅ Authentication successful');

    const translations = await api.getTranslations('it');
    
    // Save analysis
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'translation_structure_analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(translations, null, 2));
    
    console.log('\n✅ Analysis complete!');
    console.log(`📄 Results saved to: ${outputPath}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
analyzeProgramStructure();
