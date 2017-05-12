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

/* eslint camelcase: 0 */
import _ from 'lodash';

import Container, {USER_CHANGED} from '../container';

export default class CloudCodeContainer extends Container {

  constructor({ sendPluginRequest, asUserId } = {}) {
    super();
    this.asUserId = asUserId;
    this.sendPluginRequest = !!sendPluginRequest;
  }

  sendRequestObject(action, data) {
    if (this.apiKey === null) {
      throw Error('Please config ApiKey');
    }

    const extraData = {
      action: action,
      api_key: this.apiKey
    };

    const route = action.replace(':', '/');
    const request = this.request
      .post(this.url + route)
      .set('X-Skygear-API-Key', this.apiKey)
      .set('Accept', 'application/json');

    if (this.accessToken) {
      extraData.access_token = this.accessToken;
      request.set('X-Skygear-Access-Token', this.accessToken);
    }

    if (this.asUserId) {
      extraData._user_id = this.asUserId;
    }

    if (this.sendPluginRequest) {
      extraData._from_plugin = true;
    }

    return request.send(_.assign(extraData, data));
  }

  _getUser() {
    return this._user;
  }

  _setUser(attrs) {
    if (attrs !== null) {
      this._user = new this.User(attrs);
    } else {
      this._user = null;
    }
    this.ee.emit(USER_CHANGED, this._user);
    return Promise.resolve(this._user);
  }

  _getAccessToken() {
    return Promise.resolve(this._accessToken);
  }

  _setAccessToken(value) {
    this._accessToken = value;
    return Promise.resolve(value);
  }

  _getDeviceID() {
    return Promise.resolve(this._deviceID);
  }

  _setDeviceID(value) {
    this._deviceID = value;
    return Promise.resolve(value);
  }
}
