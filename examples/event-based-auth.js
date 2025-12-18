/**
 * Example: Event-Based Token Management
 * 
 * This example demonstrates how to use the 'tokens' event to automatically
 * save authentication tokens whenever they are generated or refreshed.
 * 
 * The authenticator emits a 'tokens' event in these situations:
 * 1. After successful authentication (authenticate())
 * 2. After token refresh (refresh())
 * 3. After loading saved tokens (setTokens())
 * 
 * This approach is cleaner than manually saving tokens after each operation.
 */

const fs = require('fs');
const path = require('path');
const { HonAuth } = require('..');
const { HonAPI } = require('..');

// Configuration
const TOKEN_FILE = path.join(__dirname, '.hon-tokens.json');
const EMAIL = process.env.HON_EMAIL;
const PASSWORD = process.env.HON_PASSWORD;

/**
 * Token Manager with event-based auto-save
 */
class TokenManager {
  constructor(tokenFile) {
    this.tokenFile = tokenFile;
  }

  /**
   * Saves tokens to file
   * Called automatically when 'tokens' event is emitted
   */
  save(tokens) {
    try {
      const data = {
        ...tokens,
        savedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(this.tokenFile, JSON.stringify(data, null, 2), 'utf8');
      console.log('💾 Tokens saved automatically');
    } catch (error) {
      console.error('❌ Error saving tokens:', error.message);
    }
  }

  /**
   * Loads tokens from file
   */
  load() {
    try {
      if (!fs.existsSync(this.tokenFile)) {
        console.log('📭 No saved tokens found');
        return null;
      }

      const data = fs.readFileSync(this.tokenFile, 'utf8');
      const tokens = JSON.parse(data);
      
      console.log('📬 Loaded tokens from file');
      return tokens;
    } catch (error) {
      console.error('❌ Error loading tokens:', error.message);
      return null;
    }
  }

  /**
   * Clears saved tokens
   */
  clear() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        fs.unlinkSync(this.tokenFile);
        console.log('🗑️  Tokens cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing tokens:', error.message);
    }
  }
}

/**
 * Main authentication flow with event-based token management
 */
async function main() {
  console.log('=== Event-Based Token Management ===\n');

  // Validate credentials
  if (!EMAIL || !PASSWORD) {
    console.error('❌ Error: Please set HON_EMAIL and HON_PASSWORD environment variables');
    console.log('\nExample:');
    console.log('  $env:HON_EMAIL="your-email@example.com"');
    console.log('  $env:HON_PASSWORD="your-password"');
    console.log('  node examples/event-based-auth.js');
    process.exit(1);
  }

  // Create token manager
  const tokenManager = new TokenManager(TOKEN_FILE);

  // Create authenticator
  const auth = new HonAuth(null, EMAIL, PASSWORD);  // debug=false by default

  // Setup event listener for automatic token saving
  // This will be called EVERY time tokens are generated or updated
  auth.on('tokens', (tokens) => {
    console.log('\n🔔 Event: Tokens received');
    console.log(`   - Cognito Token: ${tokens.cognitoToken.substring(0, 30)}...`);
    console.log(`   - Expires At: ${tokens.expiresAt}`);
    console.log(`   - Expires In: ${tokens.expiresIn} seconds`);
    
    // Automatically save tokens
    tokenManager.save(tokens);
  });

  // Optional: Listen for other events you might add
  auth.on('error', (error) => {
    console.error('🔔 Event: Authentication error:', error.message);
  });

  console.log('Step 1: Checking for saved tokens...\n');
  
  // Try to load saved tokens
  const savedTokens = tokenManager.load();
  let authenticated = false;

  if (savedTokens) {
    console.log('\nStep 2: Attempting to use saved tokens...');
    
    if (auth.setTokens(savedTokens)) {
      console.log('✅ Saved tokens are valid');
      console.log('✅ Skipping login (saved ~30-60 seconds)');
      // Note: 'tokens' event will be emitted by setTokens()
      authenticated = true;
    } else {
      console.log('⚠️  Saved tokens are expired or invalid');
    }
  }

  // Perform full authentication if needed
  if (!authenticated) {
    console.log('\nStep 3: Performing full authentication...');
    console.log('This may take 30-60 seconds...\n');
    
    const startTime = Date.now();
    
    try {
      await auth.authenticate();
      // Note: 'tokens' event will be emitted automatically after authentication
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ Authentication successful (${elapsed}s)`);
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      process.exit(1);
    }
  }

  // Use the API
  console.log('\n\nStep 4: Using the API...\n');
  try {
    const api = new HonAPI(auth);
    
    const appliances = await api.loadAppliances();
    console.log(`✅ Found ${appliances.length} appliance(s)\n`);
    
    if (appliances.length > 0) {
      console.log('Appliances:');
      appliances.forEach((appliance, index) => {
        console.log(`  ${index + 1}. ${appliance.nickName || appliance.modelName}`);
        console.log(`     Type: ${appliance.applianceTypeName}`);
        console.log(`     MAC: ${appliance.macAddress}\n`);
      });
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Example completed successfully\n');
  console.log('Token Management:');
  console.log('  ✓ Tokens are saved automatically via events');
  console.log('  ✓ No manual save() calls needed');
  console.log('  ✓ Works with authenticate(), refresh(), and setTokens()');
  console.log('\nNext run:');
  console.log('  → Tokens will be loaded automatically');
  console.log('  → Authentication will be skipped if tokens are valid');
}

// Run the example
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
