/**
 * Cryptographic utilities for hOn authentication
 * Provides nonce generation and password hashing functions
 * @module utils/crypto
 */

const crypto = require('crypto');

/**
 * Generate a random nonce for OAuth requests
 * Creates a UUID-like formatted string used for OAuth security
 * @public
 * @returns {string} Formatted nonce string in UUID format (8-4-4-4-12)
 * @example
 * const nonce = generateNonce();
 * // "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 */
function generateNonce() {
  const nonce = crypto.randomBytes(16).toString('hex');
  return `${nonce.slice(0, 8)}-${nonce.slice(8, 12)}-${nonce.slice(12, 16)}-${nonce.slice(16, 20)}-${nonce.slice(20)}`;
}

/**
 * Generate a random hexadecimal string
 * @public
 * @param {number} [length=16] - Length of the random bytes (result will be 2x this value)
 * @returns {string} Random hex string
 * @example
 * const hex = randomHex(8);
 * // "a1b2c3d4e5f67890" (16 characters)
 */
function randomHex(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password using SHA-256 algorithm
 * @public
 * @param {string} password - The plain text password to hash
 * @returns {string} The SHA-256 hash of the password in hexadecimal format
 * @example
 * const hashed = hashPassword('myPassword123');
 * // "5f4dcc3b5aa765d61d8327deb882cf99..."
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify a password against its hashed version
 * @public
 * @param {string} password - The plain text password to verify
 * @param {string} hashedPassword - The hashed password to compare against
 * @returns {boolean} True if password matches the hash, false otherwise
 * @example
 * const hashed = hashPassword('secret123');
 * const isValid = verifyPassword('secret123', hashed); // true
 * const isInvalid = verifyPassword('wrong', hashed);   // false
 */
function verifyPassword(password, hashedPassword) {
    const hashedInput = hashPassword(password);
    return hashedInput === hashedPassword;
}

module.exports = {
  generateNonce,
  randomHex,
  hashPassword,
  verifyPassword
};