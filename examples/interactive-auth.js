/**
 * Interactive hOn Authentication Test
 * Accepts username and password as input and attempts authentication
 */

const readline = require('readline');
const { HonAuth, HonAPI, HonDevice } = require('../index.js');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Promisified question function
 */
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Hide password input (simple version)
 */
function questionPassword(query) {
  return new Promise(resolve => {
    process.stdout.write(query);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let password = '';
    stdin.on('data', function onData(char) {
      char = char.toString('utf8');
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.exit();
          break;
        case '\u007f': // Backspace
        case '\b': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(query + '*'.repeat(password.length));
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

/**
 * Main authentication test function
 */
async function testAuthentication() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        🔐 JavahOn - Interactive Authentication Test        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('This script will attempt to authenticate with the hOn service.');
  console.log('Please enter your hOn account credentials.');
  console.log();
  console.log('⚠️  Note: Your password will be hidden as you type.');
  console.log();

  try {
    // Get email from user
    const email = await question('📧 Email address: ');
    
    if (!email || !email.includes('@')) {
      console.log('❌ Invalid email address. Please try again.');
      rl.close();
      return;
    }

    // Get password from user (hidden input)
    const password = await questionPassword('🔑 Password: ');
    
    if (!password || password.length < 3) {
      console.log('❌ Invalid password. Please try again.');
      rl.close();
      return;
    }

    console.log();
    console.log('━'.repeat(60));
    console.log();

    // Start authentication process
    console.log('🚀 Starting authentication process...');
    console.log();

    // Create device
    console.log('📱 Step 1: Creating device identity...');
    const device = new HonDevice('JavahOn-InteractiveTest');
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
    
    try {
      await auth.authenticate();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`   ✅ Authentication successful! (${elapsed}s)`);
      console.log();
      console.log('━'.repeat(60));
      console.log();
      console.log('🎉 Authentication Results:');
      console.log();
      console.log(`   ✅ Access Token: ${auth.accessToken ? auth.accessToken.substring(0, 40) + '...' : 'N/A'}`);
      console.log(`   ✅ ID Token: ${auth.idToken ? auth.idToken.substring(0, 40) + '...' : 'N/A'}`);
      console.log(`   ✅ Cognito Token: ${auth.cognitoToken ? auth.cognitoToken.substring(0, 40) + '...' : 'N/A'}`);
      console.log(`   ✅ Refresh Token: ${auth.refreshToken ? auth.refreshToken.substring(0, 40) + '...' : 'N/A'}`);
      console.log();
      console.log('━'.repeat(60));
      console.log();

      // Try to load appliances
      console.log('🏠 Step 4: Loading appliances...');
      
      // Create API client with authenticated auth instance
      const api = new HonAPI(auth);

      try {
        const appliances = await api.loadAppliances();
        console.log(`   ✅ Found ${appliances.length} appliance(s):`);
        console.log();
        
        if (appliances.length > 0) {
          // Log complete API response for first appliance
          console.log('📋 Complete API Response (first appliance):');
          console.log('━'.repeat(60));
          console.log(JSON.stringify(appliances[0], null, 2));
          console.log('━'.repeat(60));
          console.log();
          
          appliances.forEach((appliance, index) => {
            console.log(`   ${index + 1}. ${appliance.modelName || appliance.nickName || 'Unknown'}`);
            console.log(`      Type: ${appliance.applianceTypeName || 'N/A'}`);
            console.log(`      Series: ${appliance.series || 'N/A'}`);
            console.log(`      Brand: ${appliance.brand || 'N/A'}`);
            console.log(`      Serial Number: ${appliance.serialNumber || 'N/A'}`);
            console.log(`      Code: ${appliance.code || 'N/A'}`);
            console.log(`      Connectivity: ${appliance.connectivity || 'N/A'}`);
            console.log(`      Status: ${appliance.applianceStatus === 1 ? 'Active' : 'Inactive'}`);
            console.log(`      Capacity: ${appliance.applianceCapacity || 'N/A'}`);
            console.log(`      Enrollment Date: ${appliance.enrollmentDate ? new Date(appliance.enrollmentDate).toLocaleString() : 'N/A'}`);
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
      console.log('✨ Test completed successfully!');
      console.log();
      console.log('💡 Your tokens are ready to use. You can now:');
      console.log('   - Save the refresh token for future use');
      console.log('   - Use the cognito token for API calls');
      console.log('   - Control your appliances programmatically');
      console.log();

    } catch (authError) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`   ❌ Authentication failed! (${elapsed}s)`);
      console.log();
      console.log('━'.repeat(60));
      console.log();
      console.log('❌ Error Details:');
      console.log();
      console.log(`   Type: ${authError.name || 'Unknown'}`);
      console.log(`   Message: ${authError.message || 'No message available'}`);
      console.log();
      
      if (authError.name === 'HonNoAuthenticationNeeded') {
        console.log('ℹ️  This usually means you were already authenticated.');
        console.log('   Try clearing cookies and cache.');
      } else if (authError.name === 'HonAuthenticationError') {
        console.log('💡 Common causes:');
        console.log('   • Incorrect email or password');
        console.log('   • Account locked or disabled');
        console.log('   • Network connectivity issues');
        console.log('   • hOn service temporarily unavailable');
        console.log();
        console.log('💡 Troubleshooting:');
        console.log('   1. Verify your credentials in the hOn mobile app');
        console.log('   2. Check your internet connection');
        console.log('   3. Try again in a few minutes');
      }
      console.log();
    }

  } catch (error) {
    console.log();
    console.log('❌ Unexpected error occurred:');
    console.log();
    console.log(`   ${error.message}`);
    console.log();
    if (error.stack) {
      console.log('Stack trace:');
      console.log(error.stack);
    }
  } finally {
    rl.close();
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log();
  console.log();
  console.log('⚠️  Authentication cancelled by user.');
  console.log();
  rl.close();
  process.exit(0);
});

// Run the test
console.clear(); // Clear screen for better visibility
testAuthentication().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
