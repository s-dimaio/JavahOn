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
    
    // Load appliances
    console.log('📥 Loading appliances...');
    const appliances = await api.loadAppliances();
    console.log(`✅ Loaded ${appliances.length} appliances`);
    
    // Show all appliances
    console.log('\n📋 Available appliances:');
    appliances.forEach((a, i) => {
      console.log(`   ${i+1}. ${a.nickName || a.modelName || 'Unknown'}`);
      console.log(`      Type: ${a.applianceType || 'N/A'}`);
      console.log(`      TypeName: ${a.applianceTypeName || 'N/A'}`);
    });
    console.log();
    
    // Find washing machine (try multiple type identifiers)
    const wmData = appliances.find(a => 
      a.applianceType === 'WM' || 
      a.applianceTypeName === 'WM' ||
      a.applianceTypeName?.toLowerCase().includes('wash')
    );
    
    if (!wmData) {
      console.error('❌ No washing machine found');
      console.error('   Available types:', appliances.map(a => a.applianceType || a.applianceTypeName).join(', '));
      process.exit(1);
    }
    
    console.log(`✅ Found washing machine: ${wmData.nickName || wmData.modelName}`);
    
    // Create HonAppliance instance
    const appliance = new HonAppliance(api, wmData);
    
    // Load commands
    console.log('📥 Loading commands...');
    await appliance.loadCommands();
    console.log(`✅ Commands loaded: ${Object.keys(appliance.commands).length} commands`);
    
    // Get startProgram command
    const startCmd = appliance.commands.startProgram;
    if (!startCmd || !startCmd.categories) {
      console.error('❌ No startProgram command or categories found');
      process.exit(1);
    }
    
    console.log(`✅ Found ${Object.keys(startCmd.categories).length} program categories`);
    
    // Analyze structure
    const analysis = {
      timestamp: new Date().toISOString(),
      appliance: {
        nickName: wmData.nickName,
        modelName: wmData.modelName,
        applianceType: wmData.applianceType
      },
      totalCategories: Object.keys(startCmd.categories).length,
      firstCategory: null,
      samplePrograms: [],
      duplicatePrCodes: []
    };
    
    // Get first category for deep analysis
    const [firstName, firstCategory] = Object.entries(startCmd.categories)[0];
    
    console.log('\n📋 Analyzing first category structure...');
    console.log(`   ID: ${firstName}`);
    
    // Deep dump of first category
    analysis.firstCategory = {
      id: firstName,
      topLevelKeys: Object.keys(firstCategory),
      parameters: {}
    };
    
    if (firstCategory.parameters) {
      console.log(`   Parameters found: ${Object.keys(firstCategory.parameters).length}`);
      
      for (const [paramKey, paramValue] of Object.entries(firstCategory.parameters)) {
        analysis.firstCategory.parameters[paramKey] = {};
        
        if (typeof paramValue === 'object' && paramValue !== null) {
          // Capture all properties of the parameter, excluding circular references
          for (const [propKey, propValue] of Object.entries(paramValue)) {
            // Skip _appliance or any property that could be circular
            if (propKey.startsWith('_') || propKey === 'appliance' || propKey === 'parent') {
              continue;
            }
            // Only include primitive values and simple objects
            if (typeof propValue !== 'function' && typeof propValue !== 'object') {
              analysis.firstCategory.parameters[paramKey][propKey] = propValue;
            } else if (Array.isArray(propValue)) {
              analysis.firstCategory.parameters[paramKey][propKey] = propValue;
            } else if (propValue && typeof propValue === 'object') {
              // For nested objects, do a shallow copy of primitives only
              analysis.firstCategory.parameters[paramKey][propKey] = {};
              for (const [k, v] of Object.entries(propValue)) {
                if (typeof v !== 'function' && typeof v !== 'object') {
                  analysis.firstCategory.parameters[paramKey][propKey][k] = v;
                }
              }
            }
          }
        } else {
          analysis.firstCategory.parameters[paramKey] = { value: paramValue };
        }
      }
    }
    
    // Analyze all programs for duplicates
    console.log('\n📊 Analyzing all programs for duplicate prCode+prPosition...');
    const programMap = new Map();
    
    for (const [name, category] of Object.entries(startCmd.categories)) {
      const prCode = category.parameters?.prCode?.value;
      const prPosition = category.parameters?.prPosition?.value;
      
      if (prCode === undefined || prCode === null) continue;
      
      const key = `${prCode}-${prPosition}`;
      
      if (!programMap.has(key)) {
        programMap.set(key, []);
      }
      
      programMap.get(key).push({
        id: name,
        prCode: parseInt(prCode),
        prPosition: prPosition !== undefined ? parseInt(prPosition) : null,
        favourite: category.parameters?.favourite?.value,
        allParameters: Object.keys(category.parameters || {})
      });
    }
    
    // Find duplicates
    for (const [key, programs] of programMap.entries()) {
      if (programs.length > 1) {
        console.log(`   ⚠️  Duplicate: ${key} → ${programs.map(p => p.id).join(', ')}`);
        analysis.duplicatePrCodes.push({
          key,
          count: programs.length,
          programs
        });
      }
    }
    
    console.log(`   Found ${analysis.duplicatePrCodes.length} duplicate prCode+prPosition combinations`);
    
    // Sample 10 programs
    console.log('\n📋 Sampling 10 programs...');
    let count = 0;
    for (const [name, category] of Object.entries(startCmd.categories)) {
      if (count >= 10) break;
      
      const prCode = category.parameters?.prCode?.value;
      const prPosition = category.parameters?.prPosition?.value;
      
      if (prCode === undefined || prCode === null) continue;
      
      analysis.samplePrograms.push({
        id: name,
        prCode: parseInt(prCode),
        prPosition: prPosition !== undefined ? parseInt(prPosition) : null,
        favourite: category.parameters?.favourite?.value,
        parameterCount: Object.keys(category.parameters || {}).length,
        parameterKeys: Object.keys(category.parameters || {})
      });
      
      count++;
    }
    
    // Save analysis
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'program_structure_analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    
    console.log('\n✅ Analysis complete!');
    console.log(`📄 Results saved to: ${outputPath}`);
    console.log('\n' + '═'.repeat(80));
    console.log('Summary:');
    console.log(`  Total categories: ${analysis.totalCategories}`);
    console.log(`  First category parameters: ${Object.keys(analysis.firstCategory.parameters).length}`);
    console.log(`  Duplicate prCode+prPosition: ${analysis.duplicatePrCodes.length}`);
    
    // Show most critical duplicates
    if (analysis.duplicatePrCodes.length > 0) {
      console.log('\n⚠️  Critical duplicates:');
      analysis.duplicatePrCodes.slice(0, 5).forEach(dup => {
        console.log(`  ${dup.key}: ${dup.programs.map(p => p.id).join(', ')}`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
analyzeProgramStructure();
