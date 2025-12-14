/**
 * Device information class for hOn authentication
 * Ported from pyhOn device.py
 * @class
 */

const constants = require('../config/constants');

class HonDevice {
  /**
   * Creates a new HonDevice instance representing a mobile device
   * @public
   * @param {string} [mobileId=''] - Optional mobile device ID (uses default if not provided)
   * @example
   * const device = new HonDevice();
   * const customDevice = new HonDevice('my-custom-id');
   */
  constructor(mobileId = '') {
    this._appVersion = constants.APP_VERSION;
    this._osVersion = constants.OS_VERSION;
    this._os = constants.OS;
    this._deviceModel = constants.DEVICE_MODEL;
    this._mobileId = mobileId || constants.MOBILE_ID;
  }

  /**
   * Gets the application version
   * @public
   * @returns {string} Application version string
   * @example
   * const version = device.appVersion; // "2.0.10"
   */
  get appVersion() {
    return this._appVersion;
  }

  /**
   * Gets the operating system version
   * @public
   * @returns {string} OS version string
   * @example
   * const osVer = device.osVersion; // "31"
   */
  get osVersion() {
    return this._osVersion;
  }

  /**
   * Gets the operating system type
   * @public
   * @returns {string} OS type identifier
   * @example
   * const os = device.osType; // "android"
   */
  get osType() {
    return this._os;
  }

  /**
   * Gets the device model name
   * @public
   * @returns {string} Device model string
   * @example
   * const model = device.deviceModel; // "exynos9820"
   */
  get deviceModel() {
    return this._deviceModel;
  }

  /**
   * Gets the mobile device identifier
   * @public
   * @returns {string} Mobile ID string
   * @example
   * const id = device.mobileId; // "0000000000000000"
   */
  get mobileId() {
    return this._mobileId;
  }

  /**
   * Get device information as an object
   * @public
   * @param {boolean} [mobile=false] - Whether to use mobile format (mobileOs instead of os)
   * @returns {Object} Device information object containing appVersion, mobileId, os/mobileOs, osVersion, deviceModel
   * @example
   * // Standard format
   * const info = device.get();
   * // { appVersion: "2.0.10", mobileId: "xxx", os: "android", osVersion: "31", deviceModel: "exynos9820" }
   * 
   * // Mobile format
   * const mobileInfo = device.get(true);
   * // { appVersion: "2.0.10", mobileId: "xxx", mobileOs: "android", osVersion: "31", deviceModel: "exynos9820" }
   */
  get(mobile = false) {
    const result = {
      appVersion: this.appVersion,
      mobileId: this.mobileId,
      os: this.osType,
      osVersion: this.osVersion,
      deviceModel: this.deviceModel
    };

    if (mobile) {
      result.mobileOs = result.os;
      delete result.os;
    }

    return result;
  }
}

module.exports = HonDevice;