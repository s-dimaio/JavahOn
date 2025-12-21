/**
 * JavahOn - hOn Authentication Library for Node.js
 * CommonJS port of pyhOn authentication system
 */

// Main authentication classes
const { HonAuth, HonLoginData, HonAuthData, Authenticator } = require('./lib/auth/authenticator');
const HonDevice = require('./lib/auth/device');
const Session = require('./lib/auth/session');

// API client classes
const { HonAPI, ApiClient } = require('./lib/api/client');

// Connection handlers
const ConnectionHandler = require('./lib/api/handlers/base');
const HonAuthConnectionHandler = require('./lib/api/handlers/auth');
const HonConnectionHandler = require('./lib/api/handlers/hon');
const HonAnonymousConnectionHandler = require('./lib/api/handlers/anonym');

// Appliance management
const { HonAppliance, HonAttribute, HonCommand, HonCommandLoader } = require('./lib/appliances');

// Appliance types
const WashingMachine = require('./lib/appliances/types/wm');
const ApplianceBase = require('./lib/appliances/types/base');

// Parameter management
const { 
  HonParameter, 
  HonParameterFixed, 
  HonParameterEnum, 
  HonParameterRange, 
  HonParameterProgram 
} = require('./lib/parameters');

// MQTT client
const { MQTTClient } = require('./lib/mqtt');

// Diagnostics
const diagnostics = require('./lib/diagnostics');

// Utilities
const constants = require('./lib/config/constants');
const crypto = require('./lib/utils/crypto');
const { 
  HonAuthenticationError,
  HonNoAuthenticationNeeded,
  NoSessionException,
  NoAuthenticationException,
  ApiError
} = require('./lib/utils/exceptions');

// Main exports
module.exports = {
    // Primary authentication classes
    HonAuth,
    HonAPI,
    HonDevice,
    
    // Data containers
    HonLoginData,
    HonAuthData,
    
    // Connection handlers
    ConnectionHandler,
    HonAuthConnectionHandler,
    HonConnectionHandler,
    HonAnonymousConnectionHandler,
    
    // Appliance management
    HonAppliance,
    HonAttribute,
    HonCommand,
    HonCommandLoader,
    
    // Appliance types
    WashingMachine,
    ApplianceBase,
    
    // Parameter management
    HonParameter,
    HonParameterFixed,
    HonParameterEnum,
    HonParameterRange,
    HonParameterProgram,
    
    // MQTT client
    MQTTClient,
    
    // Diagnostics
    diagnostics,
    
    // Utilities
    constants,
    crypto,
    
    // Exception classes (individual exports)
    HonAuthenticationError,
    HonNoAuthenticationNeeded,
    NoSessionException,
    NoAuthenticationException,
    ApiError,
    
    // Legacy compatibility
    Authenticator,
    Session,
    ApiClient
};