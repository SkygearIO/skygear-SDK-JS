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
import {ErrorCodes, SkygearError} from './error';

export class PushContainer {

  constructor(container) {
    this.container = container;

    this._deviceID = null;
    this._getDeviceID();
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
   * @param {string} token - The device token
   * @param {string} type - The device type (either 'ios' or 'android')
   * @param {string} topic - The device topic, refer to application bundle
   * identifier on iOS and application package name on Android.
   **/
  registerDevice(token, type, topic) {
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

    return this.container.makeRequest('device:register', {
      type: type,
      id: deviceID,
      topic: topic,
      device_token: token //eslint-disable-line camelcase
    }).then((body) => {
      return this._setDeviceID(body.result.id);
    }, (error) => {
      // Will set the deviceID to null and try again iff deviceID is not null.
      // The deviceID can be deleted remotely, by apns feedback.
      // If the current deviceID is already null, will regards as server fail.
      let errorCode = null;
      if (error.error) {
        errorCode = error.error.code;
      }
      if (this.deviceID && errorCode === ErrorCodes.ResourceNotFound) {
        return this._setDeviceID(null).then(() => {
          return this.registerDevice(token, type);
        });
      } else {
        return Promise.reject(error);
      }
    });
  }

  /**
   * Unregister the current user from the current device.
   * This should be called when the user logouts.
   **/
  unregisterDevice() {
    if (!this.deviceID) {
      return Promise.reject(
        new SkygearError('Missing device id', ErrorCodes.InvalidArgument)
      );
    }

    return this.container.makeRequest('device:unregister', {
      id: this.deviceID
    }).then(() => {
      // do nothing
      return;
    }, (error) => {
      let errorCode = null;
      if (error.error) {
        errorCode = error.error.code;
      }
      if (errorCode === ErrorCodes.ResourceNotFound) {
        // regard it as success
        return this._setDeviceID(null);
      } else {
        return Promise.reject(error);
      }
    });
  }

  /**
   * The device ID.
   *
   * @return {String}
   */
  get deviceID() {
    return this._deviceID;
  }

  _getDeviceID() {
    return this.container.store.getItem('skygear-deviceid').then((deviceID) => {
      this._deviceID = deviceID;
      return deviceID;
    }, (err) => {
      console.warn('Failed to get deviceid', err);
      this._deviceID = null;
      return null;
    });
  }

  _setDeviceID(value) {
    this._deviceID = value;
    const store = this.container.store;
    const setItem = value === null ? store.removeItem('skygear-deviceid')
        : store.setItem('skygear-deviceid', value);
    return setItem.then(() => {
      return value;
    }, (err) => {
      console.warn('Failed to persist deviceid', err);
      return value;
    }).then((deviceID) => {
      this.container.pubsub._reconfigurePubsubIfNeeded();
      return deviceID;
    });
  }

}
