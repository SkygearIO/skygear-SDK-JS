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
const _ = require('lodash');

import Container from '../container';

export default class CloudCodeContainer extends Container {

  constructor() {
    super();
    this.asUserId = null;
  }

  sendRequestObject(action, data) {
    if (this.apiKey === null) {
      throw Error('Please config ApiKey');
    }
    let _data = _.assign({
      action: action,
      api_key: this.apiKey
    }, data);
    let _action = action.replace(':', '/');
    let request = this.request
      .post(this.url + _action)
      .set('X-Skygear-API-Key', this.apiKey)
      .set('Accept', 'application/json');
    if (this.accessToken) {
      _data.access_token = this.accessToken;
      request = request.set('X-Skygear-Access-Token', this.accessToken);
    }
    if (this.asUserId) {
      _data._user_id = this.asUserId;
    }
    return request.send(_data);
  }

}
