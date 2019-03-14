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

import {EventHandle, toJSON} from './util';
import Role from './role';
import {
  getUserIDFromParams
} from './util';

export const USER_CHANGED = 'userChanged';

/**
 * Auth container
 *
 * Provides User authentications and user roles API.
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
   * @type {UserRecord}
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
   * @param  {Object} authData - unique identifier of the user
   * @param  {String} password - password of the user
   * @param  {Object} [data={}] - data saved to the user record
   * @return {Promise<UserRecord>} promise with created user record
   */
  async signup(authData, password, data = {}) {
    const authResponse = await this.container.makeRequest('_auth:signup', {
      auth_data: authData, // eslint-disable-line camelcase
      password: password,
      profile: toJSON(data)
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
   * @return {Promise<UserRecord>} promise with the created user record
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
   * @return {Promise<UserRecord>} promise with the created user record
   */
  async signupWithEmail(email, password, data = {}) {
    return this.signup({
      email: email
    }, password, data);
  }

  /**
   * Creates an anonymous user account and log in as the created user.
   *
   * @return {Promise<UserRecord>} promise with the created user record
   */
  async signupAnonymously() {
    return this.signup(null, null, null);
  }

  /**
   * Logs in to an existing user account with the specified auth data and
   * password.
   *
   * @param  {Object} authData - unique identifier of the user
   * @param  {String} password - password of the user
   * @return {Promise<UserRecord>} promise with the logged in user record
   */
  async login(authData, password) {
    const authResponse = await this.container.makeRequest('_auth:login', {
      auth_data: authData, // eslint-disable-line camelcase
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
   * @return {Promise<UserRecord>} promise with the logged in user record
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
   * @return {Promise<UserRecord>} promise with the logged in user record
   */
  async loginWithEmail(email, password) {
    return this.login({
      email: email
    }, password);
  }

  /**
   * Logs in to an existing user account with custom auth provider.
   *
   * @param  {String} provider - provider name
   * @param  {Object} authData - provider auth data
   * @return {Promise<UserRecord>} promise with the logged in user record
   */
  async loginWithProvider(provider, authData) {
    const authResponse = await this.container.makeRequest('_auth:login', {
      provider: provider,
      provider_auth_data: authData // eslint-disable-line camelcase
    });
    return this._authResolve(authResponse);
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
   * @return {Promise<UserRecord>} promise with current user record
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
   * @return {Promise<UserRecord>} promise with current user record
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
   * Gets roles of users from server.
   *
   * @param  {UserRecord[]|String[]} usersOrUserIDs - user records or user IDs
   * @return {Promise<Object>} promise with userID-to-roles map
   */
  async fetchUserRole(usersOrUserIDs) {
    const userIDs = _.map(usersOrUserIDs, getUserIDFromParams);
    const body = await this.container.makeRequest('_auth:role:get', {
      users: userIDs
    });

    return Object.keys(body.result)
      .map((key) => [key, body.result[key]])
      .reduce((acc, pairs) => ({
        ...acc,
        [pairs[0]]: pairs[1].map((name) => new Role(name))
      }), {});
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
      value = JSON.stringify(this._user);
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
    return this.container.UserRecord;
  }

}
