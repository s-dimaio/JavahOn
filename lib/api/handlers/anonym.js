/**
 * Anonymous connection handler for public endpoints
 * Ported from pyhOn handler/anonym.py
 */

const ConnectionHandler = require('./base');

class HonAnonymousConnectionHandler extends ConnectionHandler {
  constructor(session = null) {
    super(session);
    // Anonymous handler uses base headers without authentication
  }

  /**
   * Create and initialize the handler
   * @returns {Promise<HonAnonymousConnectionHandler>} Initialized handler
   */
  static async create(session = null) {
    return new HonAnonymousConnectionHandler(session);
  }
}

module.exports = HonAnonymousConnectionHandler;