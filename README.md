# JavahOn 🏠

**JavahOn** is a JavaScript/Node.js library that replicates the authentication process of the [pyhOn](https://github.com/Andre0512/pyhOn) Python library for hOn smart home appliances from Haier and Candy. It provides a CommonJS implementation for Node.js applications.

## 📑 Table of Contents

- [Purpose](#-purpose)
- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Testing](#-testing)
- [API Reference](#-api-reference)
- [Authentication Flow](#-authentication-flow)
- [Appliance Operations](#-appliance-operations)
- [MQTT Real-time Communication](#-mqtt-real-time-communication)
- [Diagnostics & Data Export](#-diagnostics--data-export)
- [Migration from pyhOn](#-migration-from-pyhon)
- [Documentation](#-documentation)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## 🎯 Purpose

This library enables authentication with the hOn ecosystem (Haier and Candy smart appliances) using the same OAuth2 flow as the original Python implementation, but adapted for JavaScript/Node.js environments.

## 🚀 Features

- ✅ **Complete OAuth2 Flow** - Full implementation of hOn's Salesforce-based authentication
- ✅ **Token Management** - Automatic token refresh and session handling
- ✅ **Event-Based Token Saving** - Automatic token persistence via events (NEW!)
- ✅ **Device Simulation** - Mimics mobile app behavior
- ✅ **API Client** - Ready-to-use client for hOn API endpoints
- ✅ **Appliance Management** - Complete device management with commands and parameters
- ✅ **Real-time MQTT** - WebSocket communication with AWS IoT Core for live updates
- ✅ **Diagnostics & Export** - Comprehensive data export in YAML/JSON/ZIP formats
- ✅ **Data Anonymization** - Safe sharing of diagnostic information
- ✅ **CommonJS Compatible** - Works with require() in Node.js
- ✅ **Error Handling** - Comprehensive error management with custom exceptions
- ✅ **Legacy Support** - Maintains compatibility with existing authentication patterns
- ✅ **Interactive Testing** - Built-in scripts for easy authentication testing

## 📦 Installation

### From GitHub

```bash
npm install github:YOUR_GITHUB_USERNAME/JavahOn
```

### Local Development

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/JavahOn.git
cd JavahOn
npm install
```

### Dependencies

The following packages will be installed automatically:

```json
{
  "axios": "^0.27.2",
  "cheerio": "^1.0.0-rc.12",
  "tough-cookie": "^4.1.4",
  "bcrypt": "^5.0.1",
  "jsonwebtoken": "^8.5.1",
  "mqtt": "^5.14.1",
  "archiver": "^7.0.1"
}
```

## 🔧 Quick Start

### Basic hOn Authentication (Headless)

```javascript
const { HonAuth, HonAPI, HonDevice } = require('./index.js');

async function authenticate() {
    try {
        // Create device and authentication instances
        const device = new HonDevice('MyApp-Device');
        const auth = new HonAuth(null, 'your-email@example.com', 'your-password', device);
        
        // Perform authentication
        await auth.authenticate();
        console.log('Authentication successful!');
        
        // Create API client
        const api = new HonAPI({
            email: 'your-email@example.com',
            password: 'your-password',
            mobileId: device.mobileId
        });
        
        await api.create();
        
        // Load appliances
        const appliances = await api.loadAppliances();
        console.log(`Found ${appliances.length} appliances`);
        
    } catch (error) {
        console.error('Authentication failed:', error.message);
    }
}

authenticate();
```

### Event-Based Token Saving (Recommended)

The library emits a `tokens` event whenever tokens are generated or refreshed, making token persistence automatic:

```javascript
const { HonAuth, HonAPI } = require('./index.js');
const fs = require('fs');

async function authenticateWithEvents() {
    const auth = new HonAuth(null, 'your-email@example.com', 'your-password');
    
    // Listen for tokens - automatically called after auth/refresh/setTokens
    auth.on('tokens', (tokens) => {
        console.log('Tokens received!');
        // Save to file, database, keychain, etc.
        fs.writeFileSync('.hon-tokens.json', JSON.stringify(tokens, null, 2));
    });
    
    // Try to load saved tokens (fast!)
    if (fs.existsSync('.hon-tokens.json')) {
        const saved = JSON.parse(fs.readFileSync('.hon-tokens.json'));
        if (auth.setTokens(saved)) {
            console.log('Using saved tokens (1-2s instead of 30-60s!)');
        }
    } else {
        // Full authentication (30-60s)
        await auth.authenticate();
    }
    
    // Use the API
    const api = new HonAPI(auth);
    const appliances = await api.loadAppliances();
    console.log(`Found ${appliances.length} appliances`);
}

authenticateWithEvents();
```

**See:** [`examples/event-based-auth.js`](examples/event-based-auth.js) for a complete working example with token management.

### Manual Browser Authentication (More Secure)

For enhanced security, you can use browser-based authentication where the user enters credentials directly in the official hOn web form:

```javascript
const { HonManualAuth, HonAPI, HonDevice } = require('./index.js');

async function authenticateWithBrowser() {
    try {
        // Create device and manual auth instance
        const device = new HonDevice('MyApp-Device');
        const auth = new HonManualAuth(null, null, null, device);
        
        // Start browser-based authentication
        // This will:
        // 1. Start a local web server
        // 2. Open the hOn login page in your default browser
        // 3. Wait for you to log in
        // 4. Intercept the OAuth callback
        await auth.authenticateManual(3000); // port 3000
        
        console.log('Authentication successful!');
        
        // Create API client with authenticated session
        const api = new HonAPI(auth);
        const appliances = await api.loadAppliances();
        console.log(`Found ${appliances.length} appliances`);
        
    } catch (error) {
        console.error('Authentication failed:', error.message);
    }
}

authenticateWithBrowser();
```

**Benefits of Manual Authentication:**
- ✅ **More Secure** - Password never handled by your application
- ✅ **2FA Support** - Works with two-factor authentication
- ✅ **CAPTCHA-proof** - Handles any security measures hOn adds
- ✅ **Official Form** - Uses the real hOn login page

**When to use Manual vs Headless:**
- **Use Manual** for: Desktop apps, first-time setup, sensitive accounts
- **Use Headless** for: Automation, servers, scripts, IoT devices

Quick command:
```bash
npm run auth:manual
```

### Using with Refresh Token

```javascript
const { HonAPI } = require('./index.js');

async function authenticateWithRefreshToken() {
    const api = new HonAPI({
        email: 'your-email@example.com',
        password: 'your-password',
        refreshToken: 'your-existing-refresh-token'
    });
    
    await api.create();
    const appliances = await api.loadAppliances();
    console.log(appliances);
}
```

## 📚 API Reference

### Classes

#### `HonAuth`
Main authentication class handling the OAuth2 flow (headless mode).

```javascript
const auth = new HonAuth(session, email, password, device);
await auth.authenticate();        // Perform full authentication
await auth.refresh(refreshToken); // Refresh existing tokens
auth.clear();                     // Clear authentication data
```

#### `HonManualAuth`
Browser-based authentication class for manual login (extends HonAuth).

```javascript
const auth = new HonManualAuth(session, email, password, device);
await auth.authenticateManual(port);  // Start browser-based auth (default port: 3000)
// Then use like HonAuth: auth.accessToken, auth.cognitoToken, etc.
````

## 📚 API Reference

### Classes

#### `HonAuth`
Main authentication class handling the OAuth2 flow.

```javascript
const auth = new HonAuth(session, email, password, device);
await auth.authenticate();        // Perform full authentication
await auth.refresh(refreshToken); // Refresh existing tokens
auth.clear();                     // Clear authentication data
```

**Properties:**
- `cognitoToken` - Cognito authentication token
- `accessToken` - OAuth2 access token
- `refreshToken` - OAuth2 refresh token
- `idToken` - OpenID Connect ID token
- `tokenIsExpired` - Check if token has expired
- `tokenExpiresSoon` - Check if token expires soon

#### `HonAPI`
Main API client for interacting with hOn services.

```javascript
const api = new HonAPI({
    email: 'user@example.com',
    password: 'password',
    anonymous: false,           // Set to true for anonymous access
    mobileId: 'device-id',     // Optional custom device ID
    refreshToken: 'token'       // Optional existing refresh token
});

await api.create();                           // Initialize the client
const appliances = await api.loadAppliances(); // Get user's appliances
const commands = await api.loadCommands(appliance); // Get appliance commands
const stats = await api.getStatistics(appliance);   // Get appliance statistics
```

#### `HonDevice`
Device information provider.

```javascript
const device = new HonDevice('MyApp-Device-ID');
const deviceInfo = device.get();        // Get device information object
const mobileInfo = device.get(true);    // Get mobile-formatted device info
```

### Constants

Access all hOn-related constants:

```javascript
const { constants } = require('./index.js');

console.log(constants.AUTH_API);    // "https://account2.hon-smarthome.com"
console.log(constants.API_URL);     // "https://api-iot.he.services"
console.log(constants.CLIENT_ID);   // OAuth2 Client ID
```

### Exception Handling

```javascript
const { exceptions } = require('./index.js');

try {
    await auth.authenticate();
} catch (error) {
    if (error instanceof exceptions.HonAuthenticationError) {
        console.log('Authentication failed');
    } else if (error instanceof exceptions.HonNoAuthenticationNeeded) {
        console.log('Already authenticated');
    }
}
```

## 🔐 Authentication Flow

The library implements the complete hOn OAuth2 flow:

1. **Initialize OAuth** - Request authorization endpoint
2. **Parse Login Form** - Extract CSRF tokens and form data
3. **Submit Credentials** - Send username/password to Salesforce
4. **Extract Auth Code** - Parse authorization code from redirect
5. **Token Exchange** - Exchange code for OAuth2 tokens
6. **API Authentication** - Use ID token to get Cognito token
7. **Token Refresh** - Automatically refresh expired tokens

## 🧪 Testing

### Interactive Authentication Test

The easiest way to test authentication with your real hOn credentials:

```bash
npm run auth
```

This will prompt you to enter your email and password interactively, then attempt authentication and display the results.

### Command-Line Authentication Test

For automated testing or scripting:

```bash
node examples/cli-auth.js your-email@example.com your-password
```

### Basic Functionality Test

Test the library without real credentials:

```bash
npm run test:basic
```

**Note:** You'll need valid hOn account credentials to test actual authentication.

### Example Output

```
🔐 JavahOn - Interactive Authentication Test

📧 Email address: user@example.com
🔑 Password: **********

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Starting authentication process...

📱 Step 1: Creating device identity...
   ✅ Device created: JavahOn-InteractiveTest

🔧 Step 2: Initializing authentication...
   ✅ Authentication instance ready

🔑 Step 3: Authenticating with hOn servers...
   ⏳ Please wait, this may take 10-30 seconds...

   ✅ Authentication successful! (12.34s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

� Authentication Results:

   ✅ Access Token: eyJraWQiOiJrZXktMSIsImFsZyI6IlJTMj...
   ✅ ID Token: eyJraWQiOiJrZXktMSIsImFsZyI6IlJTMj...
   ✅ Cognito Token: eyJhbGciOiJSUzI1NiIsInR5cCI6Ikp...
   ✅ Refresh Token: Atnr|MQEBIElj9p7qH7S2NtBQVwQEE...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 Step 4: Loading appliances...
   ✅ Found 2 appliance(s):

   1. My Washing Machine
      Type: WM
      MAC: XX:XX:XX:XX:XX:XX
      Model: model123

   2. My Dishwasher
      Type: DW
      MAC: YY:YY:YY:YY:YY:YY
      Model: model456

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Test completed successfully!
```

## 🔗 Appliance Operations

### Loading Appliances

```javascript
const appliances = await api.loadAppliances();
appliances.forEach(appliance => {
    console.log(`${appliance.nickName} (${appliance.applianceType})`);
    console.log(`MAC: ${appliance.macAddress}`);
    console.log(`Model: ${appliance.applianceModelId}`);
});
```

### Sending Commands

```javascript
// Load available commands for an appliance
const commands = await api.loadCommands(appliances[0]);

// Send a command
await api.sendCommand(
    appliances[0].macAddress,
    { name: 'startProgram', programFamily: 'Standard' },
    { temp: 40, rpm: 1200 }
);
```

### Getting Statistics

```javascript
const stats = await api.getStatistics(appliances[0]);
console.log('Energy consumption:', stats.energy);
console.log('Usage hours:', stats.usageHours);
```

## � MQTT Real-time Communication

JavahOn includes full MQTT support for real-time appliance updates via AWS IoT Core.

### Basic Usage

```javascript
const { HonAPI, MQTTClient } = require('.');

// 1. Authenticate and load appliances
const api = new HonAPI('email@example.com', 'password');
await api.authenticate();
const appliances = await api.loadAppliances();

// 2. Connect to MQTT
const mqtt = await MQTTClient.create(api, appliances);

// 3. Listen for updates
mqtt.on('applianceUpdate', ({ appliance, payload }) => {
    console.log(`[${appliance.typeName}] Update:`, payload.parameters);
});

mqtt.on('connectionChange', ({ appliance, connected }) => {
    console.log(`[${appliance.typeName}] ${connected ? 'Online' : 'Offline'}`);
});

// 4. Graceful shutdown
process.on('SIGINT', async () => {
    await mqtt.disconnect();
    process.exit(0);
});
```

### Features

- ✅ **WebSocket Connection** - Connects to AWS IoT Core via WebSocket
- ✅ **Custom Authorizer** - Uses candy-iot-authorizer for authentication
- ✅ **Auto-reconnection** - Watchdog automatically reconnects if disconnected (5s interval)
- ✅ **Real-time Updates** - Instant parameter updates from appliances
- ✅ **Connection Events** - Monitor appliance online/offline status
- ✅ **Event Emitter** - Full event-driven architecture

### Testing MQTT

```bash
node examples/mqtt-test.js
```

See [`examples/mqtt-test.js`](examples/mqtt-test.js) for a working example.

## �🔄 Migration from pyhOn

If you're migrating from the Python pyhOn library:

| Python (pyhOn) | JavaScript (JavahOn) |
|----------------|---------------------|
| `HonAuth()` | `new HonAuth()` |
| `HonAPI()` | `new HonAPI()` |
| `HonDevice()` | `new HonDevice()` |
| `await auth.login()` | `await auth.authenticate()` |
| `async with api:` | `await api.create()` |

## 🛠️ Development

### Project Structure

```
JavahOn/
├── index.js                 # Main library entry point (root level)
├── package.json             # Dependencies and scripts
├── README.md               # This file
├── LICENSE                 # MIT License
│
├── lib/                     # Source code
│   ├── auth/
│   │   ├── authenticator.js     # Main authentication logic
│   │   ├── device.js           # Device information handling
│   │   └── session.js          # Session management
│   ├── api/
│   │   ├── client.js           # API client implementation
│   │   └── handlers/           # HTTP connection handlers
│   │       ├── base.js         # Base connection handler
│   │       ├── auth.js         # Auth-specific handler
│   │       ├── hon.js          # Authenticated hOn API handler
│   │       └── anonym.js       # Anonymous API handler
│   ├── appliances/
│   │   ├── appliance.js        # Main appliance class
│   │   ├── command.js          # Command management
│   │   ├── commandLoader.js    # Load commands from API
│   │   └── attribute.js        # Attribute value management
│   ├── parameters/
│   │   ├── base.js            # Base parameter class
│   │   ├── enum.js            # Enumeration parameters
│   │   ├── range.js           # Range parameters
│   │   ├── fixed.js           # Fixed parameters
│   │   └── program.js         # Program parameters
│   ├── mqtt/
│   │   ├── client.js          # MQTT WebSocket client
│   │   └── index.js           # MQTT exports
│   ├── diagnostics/
│   │   ├── diagnose.js        # Data export and diagnostics
│   │   ├── printer.js         # Pretty printing utilities
│   │   ├── helper.js          # Helper functions
│   │   └── index.js           # Diagnostics exports
│   ├── config/
│   │   └── constants.js        # hOn API constants and configuration
│   └── utils/
│       ├── crypto.js           # Cryptographic utilities
│       └── exceptions.js       # Custom exception classes
│
├── test/                    # Test suite
│   ├── run-tests.cmd        # Windows batch runner
│   ├── test_basic.js        # Core functionality tests (19 tests)
│   ├── test_events.js       # Event system tests (10 tests)
│   └── test_javahon.js      # Library tests (16 tests)
│
├── examples/                # Example scripts
│   ├── interactive-auth.js  # Interactive authentication
│   ├── event-based-auth.js  # Token-based auth with TokenManager
│   ├── cli-auth.js          # CLI authentication
│   ├── simple-event-auth.js # Simple event-based auth
│   ├── appliance-test.js    # Appliance control example
│   ├── diagnostic-export.js # Export appliance data as JSON
│   └── mqtt-test.js         # MQTT real-time communication
│
├── diagnostics/             # Generated diagnostic exports
│   ├── appliance_diagnostic.json
│   └── appliance_diagnostic_anonymous.json
│
├── hon-reference/           # Reference implementations (pyhOn)
│   ├── hon-auth-reference/  # Python auth reference
│   ├── hon-devices-reference/ # Python devices reference
│   ├── hon-diagnostics-reference/ # Python diagnostics reference
│   └── hon-mqtt-reference/  # Python MQTT reference
│
└── .gitignore              # Git ignore rules
```

### Adding New Features

1. **New API Endpoints**: Add methods to `HonAPI` class in `src/api/client.js`
2. **New Authentication Methods**: Extend `HonAuth` class in `src/auth/authenticator.js`
3. **New Exception Types**: Add to `src/utils/exceptions.js`
4. **New Constants**: Add to `src/config/constants.js`
5. **New Diagnostic Tools**: Add to `src/diagnostics/`

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Fails**
   - Verify your hOn account credentials
   - Check if your account is active in the hOn mobile app
   - Ensure network connectivity

2. **Token Refresh Fails**
   - The refresh token may have expired
   - Try full re-authentication with `auth.authenticate()`

3. **API Calls Fail**
   - Check if authentication is still valid
   - Verify appliance MAC addresses
   - Ensure API endpoints are accessible

### Debug Mode

Enable detailed logging by setting the debug flag:

```javascript
// Enable debug mode for more detailed error logging
process.env.DEBUG = 'javahon:*';
```

## � Documentation

### English
- **[README.md](README.md)** (this file) - Complete library documentation
- **[examples/](examples/)** - Working examples for all authentication patterns and features


## �📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [pyhOn](https://github.com/Andre0512/pyhOn) - Original Python implementation
- [Andre0512](https://github.com/Andre0512) - Creator of the original pyhOn library
- hOn/Haier/Candy - For the smart home ecosystem

## 🔗 Related Projects

- [pyhOn](https://github.com/Andre0512/pyhOn) - Original Python library
- [hOn](https://www.hon-smarthome.com/) - Official hOn smart home platform

---

**⚠️ Disclaimer**: This library is not officially associated with Haier, Candy, or hOn. It's a reverse-engineered implementation for educational and personal use.