/**
 * Copyright 2015 Oursky Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import _ from 'lodash';

import {ErrorCodes, SkygearError} from './error';
import Container from './container'; // eslint-disable-line no-unused-vars

/**
 * Push container
 */
export class PushContainer {

  /**
   * @param  {Container} container - the Skygear container
   * @return {PushContainer}
   */
  constructor(container) {
    /**
     * @private
     */
    this.container = container;

    this._deviceID = null;
  }

  /**
   * @private
   *
   * Subsclass should override the implementation and provide the device type
   */
  inferDeviceType() {
    // To be implmented by subclass
    // TODO: probably web / node, handle it later
    throw new Error('Failed to infer type, please supply a value');
  }

  /**
   * You can register your device for receiving push notifications.
   *
   * @param {string} token - the device token
   * @param {string} type - the device type (either 'ios' or 'android')
   * @param {string} topic - the device topic, refer to application bundle
   * identifier on iOS and application package name on Android
   **/
  async registerDevice(token, type, topic) {
    if (!token) {
      throw new Error('Token cannot be empty');
    }
    if (!type) {
      type = this.inferDeviceType();
    }

    let deviceID;
    if (this.deviceID) {
      deviceID = this.deviceID;
    }

    try {
      const body = await this.container.makeRequest('device:register', {
        type: type,
        id: deviceID,
        topic: topic,
        device_token: token //eslint-disable-line camelcase
      });
      return this._setDeviceID(body.result.id);
    } catch (error) {
      // Will set the deviceID to null and try again iff deviceID is not null.
      // The deviceID can be deleted remotely, by apns feedback.
      // If the current deviceID is already null, will regards as server fail.
      let errorCode = null;
      if (error) {
        errorCode = error.code;
      }
      if (this.deviceID && errorCode === ErrorCodes.ResourceNotFound) {
        await this._setDeviceID(null);
        return this.registerDevice(token, type);
      } else {
        throw error;
      }
    }
  }

  /**
   * Unregisters the current user from the current device.
   * This should be called when the user logouts.
   **/
  async unregisterDevice() {
    if (!this.deviceID) {
      throw new SkygearError('Missing device id', ErrorCodes.InvalidArgument);
    }

    try {
      await this.container.makeRequest('device:unregister', {
        id: this.deviceID
      });
    } catch (error) {
      let errorCode = null;
      if (error) {
        errorCode = error.code;
      }
      if (errorCode === ErrorCodes.ResourceNotFound) {
        // regard it as success
        return this._setDeviceID(null);
      } else {
        throw error;
      }
    }
  }

  /**
   * Send a push notification to all devices associated with the specified
   * users.
   *
   * @param {string|string[]} users - a list of User IDs
   * @param {Object} notification - push notification payload
   * @param {Object} notification.apns - push notification payload for APNS
   * @param {Object} notification.gcm - push notification payload for GCM
   * @param {?string} topic - the device topic, refer to application bundle
   * identifier on iOS and application package name on Android
   * @return {Object[]} list of users to which notification was sent
   *
   * @see https://developers.google.com/cloud-messaging/concept-options
   * @see https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CreatingtheNotificationPayload.html
   **/
  async sendToUser(users, notification, topic) {
    if (!_.isArray(users)) {
      users = [users];
    }
    let userIDs = _.map(users, function (user) {
      if (typeof user === 'string') {
        return user;
      }
      return user.id;
    });

    const result = await this.container.makeRequest('push:user', {
      user_ids: userIDs, //eslint-disable-line camelcase
      notification,
      topic
    });
    return result.result;
  }

  /**
   * Send a push notification to specified devices.
   *
   * @param {string|string[]} devices - a list of Device IDs
   * @param {Object} notification - push notification payload
   * @param {Object} notification.apns - push notification payload for APNS
   * @param {Object} notification.gcm - push notification payload for GCM
   * @param {?string} topic - the device topic, refer to application bundle
   * identifier on iOS and application package name on Android
   * @return {Object[]} list of users to which notification was sent
   *
   * @see https://developers.google.com/cloud-messaging/concept-options
   * @see https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CreatingtheNotificationPayload.html
   **/
  async sendToDevice(devices, notification, topic) {
    if (!_.isArray(devices)) {
      devices = [devices];
    }
    let deviceIDs = _.map(devices, function (device) {
      if (typeof device === 'string') {
        return device;
      }
      return device.id;
    });
    const result = await this.container.makeRequest('push:device', {
      device_ids: deviceIDs, //eslint-disable-line camelcase
      notification,
      topic
    });
    return result.result;
  }

  /**
   * The device ID
   *
   * @return {String}
   */
  get deviceID() {
    return this._deviceID;
  }

  async _getDeviceID() {
    try {
      const deviceID = await this.container.store.getItem('skygear-deviceid');
      this._deviceID = deviceID;
      return deviceID;
    } catch (err) {
      console.warn('Failed to get deviceid', err);
      this._deviceID = null;
      return null;
    }
  }

  async _setDeviceID(value) {
    this._deviceID = value;
    try {
      const store = this.container.store;
      if (value === null) {
        await store.removeItem('skygear-deviceid');
      } else {
        await store.setItem('skygear-deviceid', value);
      }
    } catch (err) {
      console.warn('Failed to persist deviceid', err);
    }
    return value;
  }
}
