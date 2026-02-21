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

**Core Dependencies** (required for authentication and API operations):
```json
{
  "axios": "^1.6.0",
  "cheerio": "^1.0.0-rc.12",
  "tough-cookie": "^4.1.4"
}
```

**Optional Dependencies** (for extended features - installation will not fail if these are unavailable):
```json
{
  "mqtt": "^5.14.1",
  "archiver": "^7.0.1",
  "express": "^4.21.2",
  "http-proxy": "^1.18.1",
  "open": "^9.1.0"
}
```

- `mqtt` - Required only if using real-time MQTT communication
- `archiver` - Required only if using diagnostic ZIP export
- `express`, `http-proxy`, `open` - Optional utilities for examples and testing

To reduce installation size, optional dependencies can be skipped during installation with `npm install --no-optional`.

## 🔧 Quick Start

### Basic hOn Authentication (Headless)

```javascript
const { HonAuth, HonAPI, HonDevice } = require('./index.js');

async function authenticate() {
    try {
        // Create device and authentication instances
        const device = new HonDevice('MyApp-Device');
        
        // Create auth instance - disable debug for production
        const auth = new HonAuth(null, 'your-email@example.com', 'your-password', device, false);
        
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

### Debug Mode

The library supports a global debug mode that controls `console.log` output across all components. When enabled, you'll see detailed information about:
- **Authentication**: OAuth URLs, cookies, login steps, token refresh
- **API Operations**: Request/response details, command loading, appliance queries
- **MQTT Communication**: Connection status, subscriptions, real-time updates
- **Appliances**: Command execution, parameter updates

When disabled (default), only errors are displayed via `console.error`.

```javascript
// Enable debug mode (verbose logging for development/troubleshooting)
const device = new HonDevice('MyApp');
const auth = new HonAuth(null, 'email@example.com', 'password', device, true);

// Debug setting automatically propagates to ALL library components:
// - HonAPI (API calls, command loading)
// - HonAppliance (appliance operations)
// - HonCommand (command execution)
// - MQTTClient (real-time communication)
// - Connection handlers (cookies, token management)

const api = new HonAPI(auth);  // Inherits debug setting
const appliances = await api.loadAppliances();  // Will show debug logs if enabled

// Disable debug mode (default - clean output for production)
const auth = new HonAuth(null, 'email@example.com', 'password', device, false);
// or simply omit the parameter:
const auth = new HonAuth(null, 'email@example.com', 'password', device);
```

**Best Practice:** Enable debug mode during development and testing, but disable it in production environments to reduce log noise.

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
Main authentication class handling the OAuth2 flow.

**Constructor:**
```javascript
const auth = new HonAuth(session, email, password, device, debug);
```

**Parameters:**
- `session` (Object, optional) - Axios session instance (creates new if not provided)
- `email` (String) - User email for authentication
- `password` (String) - User password for authentication
- `device` (HonDevice, optional) - Device info (creates default if not provided)
- `debug` (Boolean, optional, default: `false`) - Enable debug logging (console.log output)

**Methods:**
```javascript
const auth = new HonAuth(session, email, password, device, debug);
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

**Debug Mode:**
When `debug` is `true`, the authentication process will log detailed information about each step (OAuth URLs, cookies, response data, etc.). This is useful for troubleshooting but should be disabled in production. Error messages are always displayed via `console.error` regardless of debug setting.


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

## 🎯 Event-Driven Architecture

Starting from v1.4.0, the `WashingMachine` class uses **EventEmitter composition** to provide real-time state change notifications. It exposes `on`, `off`, `once`, `emit`, `removeListener`, `removeAllListeners` and `listenerCount` methods that delegate to an internal `EventEmitter` instance, enabling reactive programming patterns.

### Available Events

The `WashingMachine` class emits five types of events:

#### `attributesUpdated`
Emitted on **every MQTT update**, immediately after the appliance's internal state has been refreshed. This is the primary event used by consumers (e.g., Homey app) to react to real-time parameter changes.

**Event Data:** the raw `parameters` object from the MQTT payload (a key → `{ value }` map).

```javascript
wm.on('attributesUpdated', (params) => {
    console.log('machMode:', params.machMode?.value);
    console.log('remaining time:', params.remainingTimeMM?.value);
});
```

#### `programStarted`
Emitted when `machMode` transitions **to 2** (running).

**Event Data:**
```javascript
{
  machMode: 2,              // New state (running)
  prPhase: 1,               // Current phase number
  program: "cottons",       // prStr or prCode value from MQTT (if available)
  timestamp: 1704067200000  // Unix timestamp in milliseconds
}
```

#### `programFinished`
Emitted when `machMode` transitions **from 2** to any other state.

**Event Data:**
```javascript
{
  machMode: 5,              // New state (e.g., finished = 5 or 7)
  prPhase: 0,               // Phase at completion
  program: null,            // Program identifier (if available)
  timestamp: 1704067200000
}
```

#### `phaseChanged`
Emitted when `prPhase` changes while `machMode` is 2 (in progress).

**Event Data:**
```javascript
{
  from: 2,                  // Previous phase number
  to: 3,                    // New phase number
  fromKey: "washing",       // Previous phase key (from WASH_PHASES map)
  toKey: "rinse",           // New phase key (from WASH_PHASES map)
  program: "cottons",       // Program identifier (if available)
  timestamp: 1704067200000
}
```

#### `stateChanged`
Emitted on any `machMode` transition.

**Event Data:**
```javascript
{
  from: 2,                  // Previous machMode value
  to: 3,                    // New machMode value
  fromKey: "running",       // Previous state key (from MACHINE_STATES map)
  toKey: "paused",          // New state key (from MACHINE_STATES map)
  prPhase: 7,               // Current phase number
  timestamp: 1704067200000
}
```

### Usage Example

```javascript
const { HonAPI } = require('javahon');

const api = new HonAPI(/* credentials */);
await api.create();
const appliances = await api.loadAppliances();

// Get WashingMachine helper instance
const wm = appliances[0].extra;

// React to any attribute update (most common use case)
wm.on('attributesUpdated', (params) => {
    console.log('Received update:', params);
});

wm.on('programStarted', (event) => {
    console.log(`Program started: ${event.program}`);
});

wm.on('programFinished', (event) => {
    console.log(`Finished at ${new Date(event.timestamp)}`);
});

wm.on('phaseChanged', (event) => {
    console.log(`Phase: ${event.fromKey} → ${event.toKey}`);
});

wm.on('stateChanged', (event) => {
    console.log(`State: ${event.fromKey} → ${event.toKey}`);
});
```

### Integration with MQTT

Events are triggered automatically via `updateFromMQTT()`, which the `MQTTClient` calls internally on each incoming MQTT message. No manual wiring is needed:

```javascript
const { MQTTClient } = require('javahon');

const mqttClient = new MQTTClient(api, appliances);
await mqttClient.connect();

// updateFromMQTT() is called by MQTTClient automatically.
// Simply register listeners on the WashingMachine instance:
appliance.extra.on('attributesUpdated', (params) => {
    // Triggered on every MQTT message for this appliance
});
```

For a complete working example, see [examples/washing-machine-events.js](examples/washing-machine-events.js).

### Testing Events

```bash
node test/test_wm_events.js
```

This test suite verifies all five event types with various state transition scenarios.

## 🧪 Testing

### Run All Tests

Execute the complete test suite:

```bash
npm test
```

This runs all unit tests (18 core tests + 10 event tests + 9 debug tests).

### Test Specific Components

```bash
# Test core library functionality (HonAuth, HonAPI, HonDevice, etc.)
npm run test:javahon

# Test event system (token events, EventEmitter integration)
npm run test:events

# Test debug mode functionality
npm run test:debug

# Test WashingMachine appliance helpers
npm run test:wm

# Test program structure and duplicate detection
npm run test:programs <email> <password>

# Test API attributes loading (polling mechanism)
npm run test:api-attributes <email> <password>
```

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

### Program Lookup with Disambiguation

The `WashingMachine` appliance includes intelligent program resolution. Since custom favourites share the same `prCode` and `prPosition` as their base programs (differing only in `temp` and `spinSpeed`), `findProgramByCode` uses a cascading disambiguation strategy:

```javascript
const program = appliance.extra.findProgramByCode(
  prCode,           // Program code (e.g., 13)
  prPosition,       // Program position (e.g., 4)
  remoteEnabled,    // Optional: true → prefer IoT variants; false → prefer standard
  temp,             // Optional: temperature in °C from MQTT (disambiguates custom favourites)
  spinSpeed         // Optional: spin speed in RPM from MQTT
);
```

**Disambiguation order** (each step only applied when multiple matches remain):
1. IoT vs. non-IoT filtering (based on `remoteControlEnabled`)
2. Real programs preferred over `SPECIAL_*` programs
3. Match by `temp` value
4. Match by `spinSpeed` value
5. Prefer `favourite === 1`
6. Fallback: first match in list

`getAvailablePrograms()` now includes custom favourites (previously excluded), adding a `favourite` field (`0` or `1`) to each returned entry.

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

| Python (pyhOn)       | JavaScript (JavahOn)        |
|----------------------|-----------------------------|
| `HonAuth()`          | `new HonAuth()`             |
| `HonAPI()`           | `new HonAPI()`              |
| `HonDevice()`        | `new HonDevice()`           |
| `await auth.login()` | `await auth.authenticate()` |
| `async with api:`    | `await api.create()`        |

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