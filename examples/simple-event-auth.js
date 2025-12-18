/**
 * Simple Event-Based Authentication Example
 * 
 * The SIMPLEST way to use JavahOn with automatic token saving.
 * Just listen to the 'tokens' event and save them however you want.
 */

const { HonAuth, HonAPI } = require('..');
const fs = require('fs');

const EMAIL = process.env.HON_EMAIL;
const PASSWORD = process.env.HON_PASSWORD;
const TOKEN_FILE = '.hon-tokens.json';

async function main() {
  // 1. Create authenticator
  const auth = new HonAuth(null, EMAIL, PASSWORD);  // debug=false by default

  // 2. Listen for tokens event - THAT'S IT!
  auth.on('tokens', (tokens) => {
    // Save to file (or database, keychain, etc.)
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    console.log('💾 Tokens saved automatically!');
  });

  // 3. Try to load saved tokens
  let authenticated = false;
  if (fs.existsSync(TOKEN_FILE)) {
    const saved = JSON.parse(fs.readFileSync(TOKEN_FILE));
    if (auth.setTokens(saved)) {
      console.log('✅ Using saved tokens (fast!)');
      authenticated = true;
      // Event automatically emitted by setTokens()
    }
  }

  // 4. Authenticate if needed
  if (!authenticated) {
    console.log('🔐 Authenticating...');
    await auth.authenticate();
    // Event automatically emitted by authenticate()
    console.log('✅ Authenticated!');
  }

  // 5. Use the API
  const api = new HonAPI(auth);
  const appliances = await api.loadAppliances();
  console.log(`\n📱 Found ${appliances.length} appliances`);
}

main().catch(console.error);
