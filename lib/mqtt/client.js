/**
 * MQTT Client for AWS IoT Core Communication
 * Ported from pyhOn mqtt.py
 * 
 * Handles real-time communication with Haier appliances through AWS IoT Core
 * using WebSocket with custom authorizer authentication.
 */

const mqtt = require('mqtt');
const crypto = require('crypto');
const constants = require('../config/constants');
const EventEmitter = require('events');

/**
 * MQTT Client for real-time appliance communication
 * @class MQTTClient
 * @extends EventEmitter
 */
class MQTTClient extends EventEmitter {
    /**
     * Create a new MQTT client
     * @param {HonAPI} api - API client instance
     * @param {Array<Appliance>} appliances - List of appliances to monitor
     * @param {string} mobileId - Mobile device ID
     */
    constructor(api, appliances, mobileId = constants.MOBILE_ID) {
        super();
        this._api = api;
        this._appliances = appliances;
        this._mobileId = mobileId;
        this._client = null;
        this._connected = false;
        this._watchdogInterval = null;
        this._reconnecting = false;
    }

    /**
     * Log debug messages (only if debug mode is enabled in auth)
     * @private
     * @param {...any} args - Arguments to log
     */
    _debugLog(...args) {
        try {
            if (this._api && this._api._honHandler && this._api._honHandler._auth && 
                this._api._honHandler._auth._debug) {
                console.log(...args);
            }
        } catch (error) {
            // Silently ignore if auth not available
        }
    }

    /**
     * Create and connect the MQTT client
     * @returns {Promise<MQTTClient>} This client instance
     */
    static async create(api, appliances, mobileId) {
        const client = new MQTTClient(api, appliances, mobileId);
        await client.connect();
        return client;
    }

    /**
     * Connect to AWS IoT Core via WebSocket
     * @returns {Promise<void>}
     */
    async connect() {
        try {
            // Get AWS authentication token
            const tokenSigned = await this._api.loadAwsToken();
            const idToken = this._api.auth.idToken;

            this._debugLog('🔐 MQTT Authentication:');
            this._debugLog(`   tokenSigned: ${tokenSigned ? tokenSigned.substring(0, 50) + '...' : 'MISSING'}`);
            this._debugLog(`   idToken: ${idToken ? idToken.substring(0, 50) + '...' : 'MISSING'}`);

            if (!tokenSigned || !idToken) {
                throw new Error('Missing authentication tokens');
            }

            // Generate random client ID
            const randomHex = crypto.randomBytes(8).toString('hex');
            const clientId = `${this._mobileId}_${randomHex}`;

            this._debugLog(`   clientId: ${clientId}`);
            this._debugLog(`   endpoint: ${constants.AWS_ENDPOINT}`);

            // Build WebSocket URL with custom authorizer parameters
            const wsUrl = this._buildWebSocketUrl(tokenSigned, idToken, clientId);

            this._debugLog(`🔗 Connecting to: ${wsUrl.substring(0, 100)}...`);

            // Connect to MQTT broker
            this._client = mqtt.connect(wsUrl, {
                clientId,
                protocolVersion: 5, // MQTT 5.0
                clean: true,
                reconnectPeriod: 0, // Disable auto-reconnect, we handle it manually
                keepalive: 30,
                transformWsUrl: (url) => url // Prevent mqtt.js from modifying our URL
            });

            // Setup event handlers
            this._setupEventHandlers();

            // Wait for connection
            await this._waitForConnection();

            // Subscribe to appliance topics
            this._subscribeAppliances();

            // Start watchdog
            this._startWatchdog();

            this._debugLog('MQTT client connected successfully');
        } catch (error) {
            console.error('Failed to connect MQTT client:', error.message);
            throw error;
        }
    }

    /**
     * Build WebSocket URL with custom authorizer parameters
     * @param {string} tokenSigned - AWS tokenSigned from introspection
     * @param {string} idToken - Cognito ID token
     * @param {string} clientId - MQTT client ID
     * @returns {string} WebSocket URL
     * @private
     */
    _buildWebSocketUrl(tokenSigned, idToken, clientId) {
        // AWS IoT Core WebSocket endpoint with custom authorizer
        // The parameters need to be in the URL query string for custom authorizer
        const params = new URLSearchParams();
        params.set('x-amz-customauthorizer-name', constants.AWS_AUTHORIZER);
        params.set('x-amz-customauthorizer-signature', tokenSigned);
        params.set('token', idToken);
        
        // Build base WebSocket URL
        const baseUrl = `wss://${constants.AWS_ENDPOINT}/mqtt`;
        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Setup MQTT event handlers
     * @private
     */
    _setupEventHandlers() {
        // Connection successful
        this._client.on('connect', (connack) => {
            this._connected = true;
            this._reconnecting = false;
            this._debugLog('MQTT connected:', connack);
            this.emit('connected', connack);
        });

        // Message received
        this._client.on('message', (topic, message) => {
            this._handleMessage(topic, message);
        });

        // Connection error
        this._client.on('error', (error) => {
            console.error('MQTT error:', error.message);
            this.emit('error', error);
        });

        // Connection closed
        this._client.on('close', () => {
            this._connected = false;
            this._debugLog('MQTT connection closed');
            this.emit('disconnected');
        });

        // Reconnecting
        this._client.on('reconnect', () => {
            this._debugLog('MQTT attempting to reconnect...');
            this.emit('reconnecting');
        });

        // Offline
        this._client.on('offline', () => {
            this._connected = false;
            this._debugLog('MQTT client is offline');
            this.emit('offline');
        });
    }

    /**
     * Wait for connection to be established
     * @returns {Promise<void>}
     * @private
     */
    _waitForConnection() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('MQTT connection timeout'));
            }, 30000); // 30 second timeout

            const onConnect = () => {
                clearTimeout(timeout);
                this._client.off('error', onError);
                resolve();
            };

            const onError = (error) => {
                clearTimeout(timeout);
                this._client.off('connect', onConnect);
                reject(error);
            };

            this._client.once('connect', onConnect);
            this._client.once('error', onError);
        });
    }

    /**
     * Subscribe to all appliance topics
     * @private
     */
    _subscribeAppliances() {
        if (!this._client || !this._connected) {
            console.warn('Cannot subscribe: client not connected');
            return;
        }

        for (const appliance of this._appliances) {
            const topics = appliance.info?.topics?.subscribe || [];
            
            if (topics.length === 0) {
                console.warn(`No topics found for appliance ${appliance.macAddress}`);
                continue;
            }

            for (const topic of topics) {
                this._client.subscribe(topic, { qos: 1 }, (err) => {
                    if (err) {
                        console.error(`Failed to subscribe to ${topic}:`, err.message);
                    } else {
                        this._debugLog(`Subscribed to ${topic}`);
                    }
                });
            }
        }
    }

    /**
     * Handle incoming MQTT message
     * @param {string} topic - Message topic
     * @param {Buffer} message - Message payload
     * @private
     */
    _handleMessage(topic, message) {
        try {
            console.log(`📨 MQTT Message received on topic: ${topic}`);
            const payload = JSON.parse(message.toString());
            console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
            
            // Determine message type from topic
            if (topic.includes('/appliancestatus/update')) {
                console.log('🔄 Handling appliance status update...');
                this._handleApplianceStatusUpdate(topic, payload);
            } else if (topic.includes('/connected/')) {
                console.log('🔗 Handling connection event (connected)...');
                this._handleConnectionEvent(topic, payload, true);
            } else if (topic.includes('/disconnected/')) {
                console.log('🔗 Handling connection event (disconnected)...');
                this._handleConnectionEvent(topic, payload, false);
            } else if (topic.includes('/discovery/update')) {
                console.log('🔍 Handling discovery update...');
                this._handleDiscoveryUpdate(topic, payload);
            } else {
                this._debugLog('Unknown topic:', topic, payload);
            }

            // Emit raw message event
            this.emit('message', { topic, payload });
            console.log('✅ Message handled successfully');
        } catch (error) {
            console.error('❌ Failed to handle message:', error.message);
            console.error('   Stack:', error.stack);
            console.error('   Topic:', topic);
            console.error('   Message:', message.toString());
        }
    }

    /**
     * Handle appliance status update
     * @param {string} topic - Message topic
     * @param {Object} payload - Message payload
     * @private
     */
    _handleApplianceStatusUpdate(topic, payload) {
        console.log('🔍 Processing appliance status update...');
        
        // Extract MAC address from topic
        const macMatch = topic.match(/haier\/things\/([^/]+)\//);
        if (!macMatch) {
            console.warn('Could not extract MAC address from topic:', topic);
            return;
        }

        const macAddress = macMatch[1];
        console.log(`   MAC: ${macAddress}`);
        
        const appliance = this._appliances.find(a => a.macAddress === macAddress);

        if (!appliance) {
            console.warn('Unknown appliance:', macAddress);
            return;
        }

        console.log(`   Appliance found: ${appliance.nickName}`);
        console.log(`   Has attributes: ${!!appliance.attributes}`);
        console.log(`   Has parameters: ${!!appliance.attributes?.parameters}`);

        // Update appliance parameters
        if (payload.parameters) {
            console.log(`   Processing ${Object.keys(payload.parameters).length} parameters...`);
            
            for (const [key, value] of Object.entries(payload.parameters)) {
                try {
                    console.log(`      - ${key}: ${JSON.stringify(value)}`);
                    
                    // Check if attributes exist
                    if (!appliance.attributes) {
                        console.error(`      ❌ Appliance ${appliance.nickName} has no attributes object!`);
                        continue;
                    }
                    
                    if (!appliance.attributes.parameters) {
                        console.error(`      ❌ Appliance ${appliance.nickName} has no parameters object!`);
                        continue;
                    }
                    
                    // Initialize parameter if it doesn't exist
                    if (!appliance.attributes.parameters[key]) {
                        console.log(`      ℹ️  Creating new parameter: ${key}`);
                        appliance.attributes.parameters[key] = { value: null };
                    }
                    
                    const oldValue = appliance.attributes.parameters[key].value || appliance.attributes.parameters[key];
                    
                    // Update parameter value
                    if (typeof appliance.attributes.parameters[key] === 'object' && 'value' in appliance.attributes.parameters[key]) {
                        appliance.attributes.parameters[key].value = value;
                    } else {
                        appliance.attributes.parameters[key] = value;
                    }
                    
                    console.log(`      ✅ ${key}: ${oldValue} → ${value}`);
                    
                    // Update corresponding command parameters (if method exists)
                    if (typeof appliance.syncCommand === 'function') {
                        try {
                            appliance.syncCommand(key, value);
                        } catch (error) {
                            console.log(`      ⚠️  syncCommand failed for ${key}: ${error.message}`);
                        }
                    }
                } catch (error) {
                    console.error(`      ❌ Error processing parameter ${key}:`, error.message);
                    console.error(`         Stack:`, error.stack);
                }
            }
        }

        console.log('   📤 Emitting applianceUpdate event...');
        // Emit update event
        this.emit('applianceUpdate', { appliance, payload });
        console.log('   ✅ Appliance status update complete');
    }

    /**
     * Handle connection event
     * @param {string} topic - Message topic
     * @param {Object} payload - Message payload
     * @param {boolean} connected - Connection status
     * @private
     */
    _handleConnectionEvent(topic, payload, connected) {
        const macMatch = topic.match(/\/([^/]+)$/);
        if (!macMatch) {
            return;
        }

        const macAddress = macMatch[1];
        const appliance = this._appliances.find(a => a.macAddress === macAddress);

        if (appliance) {
            appliance.connection = connected;
            this._debugLog(`[${macAddress}] ${connected ? 'Connected' : 'Disconnected'}`);
            
            this.emit('connectionChange', { appliance, connected, payload });
        }
    }

    /**
     * Handle discovery update
     * @param {string} topic - Message topic
     * @param {Object} payload - Message payload
     * @private
     */
    _handleDiscoveryUpdate(topic, payload) {
        this._debugLog('Discovery update:', topic, payload);
        this.emit('discovery', { topic, payload });
    }

    /**
     * Start watchdog timer for auto-reconnection
     * @private
     */
    _startWatchdog() {
        // Clear existing watchdog
        if (this._watchdogInterval) {
            clearInterval(this._watchdogInterval);
        }

        // Check connection every 5 seconds
        this._watchdogInterval = setInterval(async () => {
            if (!this._connected && !this._reconnecting) {
                this._debugLog('Watchdog: Connection lost, attempting to reconnect...');
                this._reconnecting = true;
                
                try {
                    await this.disconnect();
                    await this.connect();
                } catch (error) {
                    console.error('Watchdog: Reconnection failed:', error.message);
                    this._reconnecting = false;
                }
            }
        }, 5000);
    }

    /**
     * Stop watchdog timer
     * @private
     */
    _stopWatchdog() {
        if (this._watchdogInterval) {
            clearInterval(this._watchdogInterval);
            this._watchdogInterval = null;
        }
    }

    /**
     * Disconnect from MQTT broker
     * @returns {Promise<void>}
     */
    async disconnect() {
        this._stopWatchdog();

        if (this._client) {
            return new Promise((resolve) => {
                this._client.end(false, {}, () => {
                    this._connected = false;
                    this._debugLog('MQTT client disconnected');
                    resolve();
                });
            });
        }
    }

    /**
     * Check if client is connected
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this._connected;
    }

    /**
     * Get list of monitored appliances
     * @returns {Array<Appliance>} Appliances
     */
    getAppliances() {
        return this._appliances;
    }
}

module.exports = MQTTClient;
