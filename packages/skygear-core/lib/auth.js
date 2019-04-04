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
import {EventHandle, toJSON} from './util';

export const USER_CHANGED = 'userChanged';

/**
 * Auth container
 *
 * Provides User authentications API.
 */
export class AuthContainer {
  constructor(container) {
    /**
     * @private
     */
    this.container = container;

    this._accessToken = null;
    this._user = null;
  }

  /**
   * Currently logged-in user
   * @type {User}
   */
  get currentUser() {
    return this._user;
  }

  /**
   * Current access token
   * @type {String}
   */
  get accessToken() {
    return this._accessToken;
  }

  /**
   * Registers listener which user record changed.
   *
   * @param  {function()} listener
   * @return {EventHandle}
   */
  onUserChanged(listener) {
    this.container.ee.on(USER_CHANGED, listener);
    return new EventHandle(this.container.ee, USER_CHANGED, listener);
  }

  /**
   * Creates a user account with the specified auth data, password and user
   * record data.
   *
   * @param  {Object} loginIDs - unique identifier of the user
   * @param  {String} password - password of the user
   * @param  {Object} [data={}] - data saved to the user record
   * @return {Promise<User>} promise with created user record
   */
  async signup(loginIDs, password, data = {}) {
    const authResponse = await this.container.makeRequest('_auth:signup', {
      login_ids: loginIDs, // eslint-disable-line camelcase
      password: password,
      metadata: toJSON(data)
    });
    return this._authResolve(authResponse);
  }

  /**
   * Creates a user account with the specified username, password and user
   * record data.
   *
   * @param  {String} username - username of the user
   * @param  {String} password - password of the user
   * @param  {Object} [data={}] - data saved to the user record
   * @return {Promise<User>} promise with the created user record
   */
  async signupWithUsername(username, password, data = {}) {
    return this.signup({
      username: username
    }, password, data);
  }

  /**
   * Creates a user account with the specified email, password and user record
   * data.
   *
   * @param  {String} email - email of the user
   * @param  {String} password - password of the user
   * @param  {Object} [data={}] - data saved to the user record
   * @return {Promise<User>} promise with the created user record
   */
  async signupWithEmail(email, password, data = {}) {
    return this.signup({
      email: email
    }, password, data);
  }

  /**
   * Creates an anonymous user account and log in as the created user.
   *
   * @return {Promise<User>} promise with the created user record
   */
  async signupAnonymously() {
    return this.signup(null, null, null);
  }

  /**
   * Logs in to an existing user account with the specified auth data and
   * password.
   *
   * @param  {Object} loginId - unique identifier of the user
   * @param  {String} password - password of the user
   * @return {Promise<User>} promise with the logged in user record
   */
  async login(loginId, password) {
    const authResponse = await this.container.makeRequest('_auth:login', {
      login_id: loginId, // eslint-disable-line camelcase
      password: password
    });
    return this._authResolve(authResponse);
  }

  /**
   * Logs in to an existing user account with the specified username and
   * password.
   *
   * @param  {String} username - username of the user
   * @param  {String} password - password of the user
   * @return {Promise<User>} promise with the logged in user record
   */
  async loginWithUsername(username, password) {
    return this.login({
      username: username
    }, password);
  }

  /**
   * Logs in to an existing user account with the specified email and
   * password.
   *
   * @param  {String} email - email of the user
   * @param  {String} password - password of the user
   * @return {Promise<User>} promise with the logged in user record
   */
  async loginWithEmail(email, password) {
    return this.login({
      email: email
    }, password);
  }

  /**
   * Logs out the current user of this container.
   *
   * @return {Promise} promise
   */
  async logout() {
    try {
      this.container.clearCache();
      await this.container.makeRequest('_auth:logout', {});
      return null;
    } finally {
      await Promise.all([
        this._setAccessToken(null),
        this._setUser(null)
      ]);
    }
  }

  /**
   * Retrieves current user record from server.
   *
   * @return {Promise<User>} promise with current user record
   */
  async whoami() {
    const authResponse = await this.container.makeRequest('_auth:me', {});
    return this._authResolve(authResponse);
  }

  /**
   * Changes the password of the current user.
   *
   * @param  {String}  oldPassword - old password of current user
   * @param  {String}  newPassword - new password of current user
   * @param  {Boolean} [invalidate=false] - not implemented
   * @return {Promise<User>} promise with current user record
   */
  async changePassword(oldPassword, newPassword, invalidate = false) {
    if (invalidate) {
      throw Error('Invalidate is not yet implemented');
    }
    const resp = await this.container.makeRequest('_auth:change_password', {
      old_password: oldPassword, // eslint-disable-line camelcase
      password: newPassword
    });
    return this._authResolve(resp);
  }

  /**
   * Update user's metadata.
   *
   * @param  {Object} metadata - metadata
   * @return {Promise<User>} promise with created user record
   */
  async updateMetadata(metadata) {
    const authResponse = await this.container.makeRequest(
      '_auth:update_metadata', {
        user_id: this.currentUser.userID, // eslint-disable-line camelcase
        metadata: toJSON(metadata)
      }
    );
    return this._authResolve(authResponse);
  }

  async _getAccessToken() {
    try {
      const token = await this.container.store.getItem('skygear-accesstoken');
      this._accessToken = token;
      return token;
    } catch (err) {
      console.warn('Failed to get access', err);
      this._accessToken = null;
      return null;
    }
  }

  async _setAccessToken(value) {
    try {
      this._accessToken = value;
      if (value === null) {
        await this.container.store.removeItem('skygear-accesstoken');
      } else {
        await this.container.store.setItem('skygear-accesstoken', value);
      }
    } catch (err) {
      console.warn('Failed to persist accesstoken', err);
    }
    return value;
  }

  async _authResolve(body) {
    await Promise.all([
      this._setUser(body.result),
      this._setAccessToken(body.result.access_token)
    ]);

    return this.currentUser;
  }

  async _getUser() {
    try {
      const userJSON = await this.container.store.getItem('skygear-user');
      if (!userJSON) {
        this._user = null;
        return null;
      }

      let attrs = JSON.parse(userJSON);
      if (!attrs) {
        this._user = null;
        return null;
      }

      this._user = new this._User(attrs);
      return this._user;
    } catch (err) {
      console.warn('Failed to get user', err);
      this._user = null;
      return null;
    }
  }

  async _setUser(attrs) {
    let value;
    if (attrs) {
      this._user = new this._User(attrs);
      value = JSON.stringify(this._user.toJSON());
    } else {
      this._user = null;
      value = null;
    }

    try {
      if (value === null) {
        await this.container.store.removeItem('skygear-user');
      } else {
        await this.container.store.setItem('skygear-user', value);
      }
      this.container.ee.emit(USER_CHANGED, this._user);
    } catch (err) {
      console.warn('Failed to persist user', err);
    }
  }

  get _User() {
    return this.container.User;
  }

}
