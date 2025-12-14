/**
 * Session management class for tracking user authentication sessions
 * @class
 */
class Session {
    /**
     * Creates a new Session instance
     * @public
     * @example
     * const session = new Session();
     */
    constructor() {
        this.sessionId = null;
        this.userId = null;
        this.token = null;
        this.createdAt = null;
    }

    /**
     * Creates a new session with user credentials
     * @public
     * @param {string} userId - The user identifier
     * @param {string} token - The authentication token
     * @returns {string} The generated session ID
     * @example
     * const session = new Session();
     * const sessionId = session.create('user123', 'token-xyz');
     * console.log(sessionId); // "sess_a1b2c3d4e"
     */
    create(userId, token) {
        this.sessionId = this.generateSessionId();
        this.userId = userId;
        this.token = token;
        this.createdAt = new Date();
        return this.sessionId;
    }

    /**
     * Checks if the session is valid (has both session ID and token)
     * @public
     * @returns {boolean} True if session is valid, false otherwise
     * @example
     * if (session.isValid()) {
     *   console.log('Session is active');
     * }
     */
    isValid() {
        return this.sessionId !== null && this.token !== null;
    }

    /**
     * Destroys the session by clearing all data
     * @public
     * @example
     * session.destroy();
     * console.log(session.isValid()); // false
     */
    destroy() {
        this.sessionId = null;
        this.userId = null;
        this.token = null;
        this.createdAt = null;
    }

    /**
     * Generates a unique session identifier
     * @private
     * @returns {string} A randomly generated session ID with 'sess_' prefix
     * @example
     * // Internal use only
     * const id = this.generateSessionId(); // "sess_x7y8z9abc"
     */
    generateSessionId() {
        return 'sess_' + Math.random().toString(36).substr(2, 9);
    }
}

module.exports = Session;