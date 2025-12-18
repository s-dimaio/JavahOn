/**
 * Complete appliance management example
 * Demonstrates full appliance loading and exploration
 */

const { HonAuth, HonAPI, HonDevice, HonAppliance } = require('..');

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🏠 JavahOn - Complete Appliance Management Test       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  // Get credentials (in production, use environment variables or secure storage)
  const email = process.argv[2] || process.env.HON_EMAIL;
  const password = process.argv[3] || process.env.HON_PASSWORD;

  if (!email || !password) {
    console.log('Usage: node examples/appliance-test.js <email> <password>');
    console.log('Or set HON_EMAIL and HON_PASSWORD environment variables');
    process.exit(1);
  }

  try {
    // Step 1: Authentication
    console.log('🔑 Step 1: Authenticating...');
    const device = new HonDevice('ApplianceTest');
    const auth = new HonAuth(null, email, password, device, false);  // Disable debug for clean output
    await auth.authenticate();
    console.log('✅ Authentication successful!');
    console.log();

    // Step 2: Create API client
    console.log('🔧 Step 2: Creating API client...');
    const api = new HonAPI(auth);
    console.log('✅ API client ready!');
    console.log();

    // Step 3: Load appliances list
    console.log('📱 Step 3: Loading appliances...');
    const appliancesList = await api.loadAppliances();
    console.log(`✅ Found ${appliancesList.length} appliance(s)`);
    console.log();

    if (appliancesList.length === 0) {
      console.log('ℹ️  No appliances found on this account.');
      return;
    }

    // Step 4: Process first appliance
    console.log('━'.repeat(60));
    console.log('🏠 APPLIANCE DETAILS');
    console.log('━'.repeat(60));
    console.log();

    const applianceInfo = appliancesList[0];
    console.log('📦 Creating appliance object...');
    const appliance = new HonAppliance(api, applianceInfo);
    console.log('✅ Appliance object created!');
    console.log();

    // Step 5: Load commands
    console.log('⏳ Loading commands...');
    await appliance.loadCommands();
    console.log(`✅ Loaded ${Object.keys(appliance.commands).length} command(s)`);
    console.log();

    // Step 6: Load attributes
    console.log('⏳ Loading attributes...');
    await appliance.loadAttributes();
    const attrCount = appliance.attributes.parameters 
      ? Object.keys(appliance.attributes.parameters).length 
      : 0;
    console.log(`✅ Loaded ${attrCount} attribute(s)`);
    console.log();

    // Step 7: Load statistics
    console.log('⏳ Loading statistics...');
    await appliance.loadStatistics();
    const statsCount = Object.keys(appliance.statistics).length;
    console.log(`✅ Loaded ${statsCount} statistic(s)`);
    console.log();

    // Display appliance information
    console.log('━'.repeat(60));
    console.log('📊 APPLIANCE INFORMATION');
    console.log('━'.repeat(60));
    console.log();

    console.log('📱 Basic Info:');
    console.log(`  Model Name: ${appliance.modelName}`);
    console.log(`  Brand: ${appliance.brand}`);
    console.log(`  Type: ${appliance.applianceType}`);
    console.log(`  Nickname: ${appliance.nickName}`);
    console.log(`  Serial Number: ${appliance.info.serialNumber || 'N/A'}`);
    console.log(`  MAC Address: ${appliance.macAddress || 'N/A'}`);
    console.log(`  Code: ${appliance.code}`);
    console.log(`  Connected: ${appliance.connection ? '✅ Yes' : '❌ No'}`);
    console.log();

    // Display commands
    console.log('🔧 Available Commands:');
    const commands = Object.keys(appliance.commands);
    if (commands.length > 0) {
      commands.forEach((cmd, idx) => {
        console.log(`  ${idx + 1}. ${cmd}`);
      });
    } else {
      console.log('  No commands available');
    }
    console.log();

    // Display detailed command info for first command
    if (commands.length > 0) {
      const firstCommand = appliance.commands[commands[0]];
      console.log(`📝 Details for "${commands[0]}" command:`);
      console.log(`  Parameters: ${Object.keys(firstCommand.parameters).length}`);
      
      if (Object.keys(firstCommand.parameters).length > 0) {
        console.log('  Parameter List:');
        for (const [paramName, param] of Object.entries(firstCommand.parameters)) {
          const paramType = param.constructor.name.replace('HonParameter', '');
          console.log(`    - ${paramName} (${paramType}): ${param.value}`);
          
          // Show additional info for specific parameter types
          if (param.values && param.values.length <= 5) {
            console.log(`      Options: [${param.values.join(', ')}]`);
          } else if (param.min !== undefined) {
            console.log(`      Range: ${param.min} - ${param.max} (step: ${param.step})`);
          }
        }
      }
      console.log();
    }

    // Display attributes
    if (appliance.attributes.parameters) {
      console.log('⚙️ Current Attributes:');
      const params = appliance.attributes.parameters;
      const paramKeys = Object.keys(params);
      
      if (paramKeys.length > 0) {
        // Show first 10 attributes
        const displayCount = Math.min(10, paramKeys.length);
        for (let i = 0; i < displayCount; i++) {
          const key = paramKeys[i];
          const attr = params[key];
          console.log(`  ${key}: ${attr.value}`);
        }
        
        if (paramKeys.length > 10) {
          console.log(`  ... and ${paramKeys.length - 10} more`);
        }
      } else {
        console.log('  No attributes available');
      }
      console.log();
    }

    // Display statistics
    if (Object.keys(appliance.statistics).length > 0) {
      console.log('📊 Statistics:');
      console.log(JSON.stringify(appliance.statistics, null, 2));
      console.log();
    }

    // Display all data as JSON
    console.log('━'.repeat(60));
    console.log('📄 COMPLETE APPLIANCE DATA (JSON)');
    console.log('━'.repeat(60));
    console.log();
    console.log(JSON.stringify({
      model: appliance.modelName,
      brand: appliance.brand,
      type: appliance.applianceType,
      serial: appliance.info.serialNumber,
      mac: appliance.macAddress,
      connected: appliance.connection,
      commands: Object.keys(appliance.commands),
      attributesCount: appliance.attributes.parameters 
        ? Object.keys(appliance.attributes.parameters).length 
        : 0,
      statisticsCount: Object.keys(appliance.statistics).length
    }, null, 2));
    console.log();

    console.log('━'.repeat(60));
    console.log('✨ Test completed successfully!');
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
