/**
 * Command-line hOn Authentication Test
 * Usage: node examples/cli-auth.js <email> <password>
 */

const { HonAuth, HonAPI, HonDevice } = require('../index.js');

/**
 * Main authentication function
 */
async function authenticateWithCredentials(email, password) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          🔐 JavahOn - CLI Authentication Test              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  try {
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${'*'.repeat(password.length)}`);
    console.log();
    console.log('━'.repeat(60));
    console.log();

    // Create device
    console.log('📱 Step 1: Creating device identity...');
    const device = new HonDevice('JavahOn-CLI-Test');
    console.log(`   ✅ Device created: ${device.mobileId}`);
    console.log();

    // Create authentication instance
    console.log('🔧 Step 2: Initializing authentication...');
    const auth = new HonAuth(null, email, password, device);
    console.log('   ✅ Authentication instance ready');
    console.log();

    // Perform authentication
    console.log('🔑 Step 3: Authenticating with hOn servers...');
    console.log('   ⏳ Please wait, this may take 10-30 seconds...');
    console.log();

    const startTime = Date.now();
    
    await auth.authenticate();
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`   ✅ Authentication successful! (${elapsed}s)`);
    console.log();
    console.log('━'.repeat(60));
    console.log();
    console.log('🎉 Authentication Results:');
    console.log();
    console.log('Access Token:');
    console.log(`   ${auth.accessToken || 'N/A'}`);
    console.log();
    console.log('ID Token:');
    console.log(`   ${auth.idToken || 'N/A'}`);
    console.log();
    console.log('Cognito Token:');
    console.log(`   ${auth.cognitoToken || 'N/A'}`);
    console.log();
    console.log('Refresh Token:');
    console.log(`   ${auth.refreshToken || 'N/A'}`);
    console.log();
    console.log('━'.repeat(60));
    console.log();

    // Try to load appliances
    console.log('🏠 Step 4: Loading appliances...');
    const api = new HonAPI({
      email: email,
      password: password,
      mobileId: device.mobileId
    });
    
    // Reuse existing auth
    api._honHandler = {
      _auth: auth,
      get: async (url, config) => {
        const axios = require('axios');
        const response = await axios.get(url, {
          ...config,
          headers: {
            'cognito-token': auth.cognitoToken,
            'Content-Type': 'application/json',
            ...config?.headers
          }
        });
        return response;
      }
    };

    try {
      const appliances = await api.loadAppliances();
      console.log(`   ✅ Found ${appliances.length} appliance(s)`);
      console.log();
      
      if (appliances.length > 0) {
        appliances.forEach((appliance, index) => {
          console.log(`   ${index + 1}. ${appliance.nickName || appliance.modelName || 'Unknown'}`);
          console.log(`      Type: ${appliance.applianceType || 'N/A'}`);
          console.log(`      MAC: ${appliance.macAddress || 'N/A'}`);
          console.log(`      Model: ${appliance.applianceModelId || 'N/A'}`);
          console.log();
        });
      } else {
        console.log('   ℹ️  No appliances found on this account.');
        console.log();
      }
    } catch (appError) {
      console.log('   ⚠️  Could not load appliances:', appError.message);
      console.log();
    }

    console.log('━'.repeat(60));
    console.log();
    console.log('✨ Authentication completed successfully!');
    console.log();

    // Return results for programmatic use
    return {
      success: true,
      tokens: {
        accessToken: auth.accessToken,
        idToken: auth.idToken,
        cognitoToken: auth.cognitoToken,
        refreshToken: auth.refreshToken
      }
    };

  } catch (error) {
    console.log('━'.repeat(60));
    console.log();
    console.log('❌ Authentication Failed!');
    console.log();
    console.log(`   Type: ${error.name || 'Unknown'}`);
    console.log(`   Message: ${error.message || 'No message available'}`);
    console.log();
    
    if (error.name === 'HonAuthenticationError') {
      console.log('💡 Troubleshooting:');
      console.log('   • Verify your email and password');
      console.log('   • Check your internet connection');
      console.log('   • Ensure your hOn account is active');
      console.log('   • Try logging into the hOn mobile app first');
    }
    console.log();
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Parse command-line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          🔐 JavahOn - CLI Authentication Test              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('Usage:');
  console.log('  node examples/cli-auth.js <email> <password>');
  console.log();
  console.log('Example:');
  console.log('  node examples/cli-auth.js user@example.com mypassword123');
  console.log();
  console.log('Alternative:');
  console.log('  npm run auth      # Interactive mode with prompts');
  console.log();
  process.exit(1);
}

const [email, password] = args;

// Run authentication
authenticateWithCredentials(email, password)
  .then(result => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
