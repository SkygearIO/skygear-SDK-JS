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
import {AuthContainer, USER_CHANGED} from '../auth';

export class CloudCodeAuthContainer extends AuthContainer {

  _getUser() {
    return Promise.resolve(this._user);
  }

  _setUser(attrs) {
    if (attrs !== null) {
      this._user = new this.User(attrs);
    } else {
      this._user = null;
    }
    this.container.ee.emit(USER_CHANGED, this._user);
    return Promise.resolve(this._user);
  }

  _getAccessToken() {
    return Promise.resolve(this._accessToken);
  }

  _setAccessToken(value) {
    this._accessToken = value;
    return Promise.resolve(value);
  }

}
