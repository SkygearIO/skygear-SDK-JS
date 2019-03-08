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
import {ErrorCodes} from './error';
import Role from './role';
import {
  getUserIDFromParams,
  getRoleNameFromParams
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
   * @type {Record}
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
   * @return {Promise<Record>} promise with created user record
   */
  async signup(authData, password, data = {}) {
    const authResponse = await this.container.makeRequest('auth:signup', {
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
   * @return {Promise<Record>} promise with the created user record
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
   * @return {Promise<Record>} promise with the created user record
   */
  async signupWithEmail(email, password, data = {}) {
    return this.signup({
      email: email
    }, password, data);
  }

  /**
   * Creates an anonymous user account and log in as the created user.
   *
   * @return {Promise<Record>} promise with the created user record
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
   * @return {Promise<Record>} promise with the logged in user record
   */
  async login(authData, password) {
    const authResponse = await this.container.makeRequest('auth:login', {
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
   * @return {Promise<Record>} promise with the logged in user record
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
   * @return {Promise<Record>} promise with the logged in user record
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
   * @return {Promise<Record>} promise with the logged in user record
   */
  async loginWithProvider(provider, authData) {
    const authResponse = await this.container.makeRequest('auth:login', {
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
      try {
        await this.container.push.unregisterDevice();
      } catch (error) {
        if (error.code === ErrorCodes.InvalidArgument &&
            error.message === 'Missing device id'
        ) {
          // fallthrough
        } else {
          throw error;
        }
      }

      this.container.clearCache();
      await this.container.makeRequest('auth:logout', {});
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
   * @return {Promise<Record>} promise with current user record
   */
  async whoami() {
    const authResponse = await this.container.makeRequest('auth:me', {});
    return this._authResolve(authResponse);
  }

  /**
   * Changes the password of the current user.
   *
   * @param  {String}  oldPassword - old password of current user
   * @param  {String}  newPassword - new password of current user
   * @param  {Boolean} [invalidate=false] - not implemented
   * @return {Promise<Record>} promise with current user record
   */
  async changePassword(oldPassword, newPassword, invalidate = false) {
    if (invalidate) {
      throw Error('Invalidate is not yet implemented');
    }
    const resp = await this.container.makeRequest('auth:change_password', {
      old_password: oldPassword, // eslint-disable-line camelcase
      password: newPassword
    });
    return this._authResolve(resp);
  }

  /**
   * Reset user password, require master key.
   *
   * @param  {Record|String} userOrUserID - target user or user ID
   * @param  {String} newPassword - new password of target user
   * @return {Promise<String>} promise with target user ID
   */
  async adminResetPassword(userOrUserID, newPassword) {
    const userID = getUserIDFromParams(userOrUserID);
    await this.container.makeRequest('auth:reset_password', {
      auth_id: userID, // eslint-disable-line camelcase
      password: newPassword
    });

    return userID;
  }

  /**
   * Defines roles to have admin right.
   *
   * @param {Role[]} roles - roles to have admin right
   * @return {Promise<String[]>} promise with role names
   */
  async setAdminRole(roles) {
    let roleNames = _.map(roles, function (perRole) {
      return perRole.name;
    });

    const body = await this.container.makeRequest('auth:role:admin', {
      roles: roleNames
    });
    return body.result;
  }

  /**
   * Sets default roles for new registered users.
   *
   * @param {Role[]} roles - default roles
   * @return {Promise<String[]>} promise with role names
   */
  async setDefaultRole(roles) {
    let roleNames = _.map(roles, function (perRole) {
      return perRole.name;
    });

    const body = await this.container.makeRequest('auth:role:default', {
      roles: roleNames
    });
    return body.result;
  }

  /**
   * Gets roles of users from server.
   *
   * @param  {Record[]|String[]} usersOrUserIDs - user records or user IDs
   * @return {Promise<Object>} promise with userID-to-roles map
   */
  async fetchUserRole(usersOrUserIDs) {
    const userIDs = _.map(usersOrUserIDs, getUserIDFromParams);
    const body = await this.container.makeRequest('auth:role:get', {
      users: userIDs
    });

    return Object.keys(body.result)
      .map((key) => [key, body.result[key]])
      .reduce((acc, pairs) => ({
        ...acc,
        [pairs[0]]: pairs[1].map((name) => new Role(name))
      }), {});
  }

  /**
   * Assigns roles to users.
   *
   * @param  {Record[]|String[]} usersOrUserIDs - target users or user IDs
   * @param  {Role[]|String[]} rolesOrRoleNames - roles or role names
   *                                              to be assigned
   * @return {Promise<String[]>} promise with the target user IDs
   */
  async assignUserRole(usersOrUserIDs, rolesOrRoleNames) {
    const userIDs = _.map(usersOrUserIDs, getUserIDFromParams);
    const roleNames = _.map(rolesOrRoleNames, getRoleNameFromParams);

    const body = await this.container.makeRequest('auth:role:assign', {
      users: userIDs,
      roles: roleNames
    });

    return body.result;
  }

  /**
   * Revokes roles from users.
   *
   * @param  {Record[]|String[]} usersOrUserIDs - target users or user IDs
   * @param  {Role[]|String[]} rolesOrRoleNames - roles or role names
   *                                              to be revoked
   * @return {Promise<String[]>} promise with target user IDs
   */
  async revokeUserRole(usersOrUserIDs, rolesOrRoleNames) {
    const userIDs = _.map(usersOrUserIDs, getUserIDFromParams);
    const roleNames = _.map(rolesOrRoleNames, getRoleNameFromParams);

    const body = await this.container.makeRequest('auth:role:revoke', {
      users: userIDs,
      roles: roleNames
    });

    return body.result;
  }

  /**
   * Enable user account of a user.
   *
   * This function is intended for admin use.
   *
   * @param  {Record|String} userOrUserID - target user or user ID
   * @return {Promise<String>} promise with target user ID
   */
  async adminEnableUser(userOrUserID) {
    const userID = getUserIDFromParams(userOrUserID);
    await this.container.makeRequest('auth:disable:set', {
      auth_id: userID, // eslint-disable-line camelcase
      disabled: false
    });

    return userID;
  }

  /**
   * Disable user account of a user.
   *
   * This function is intended for admin use.
   *
   * @param  {Record|String} userOrUserID - target user or user ID
   * @param  {String} [message] - message to be shown to user
   * @param  {Date} [expiry] - date and time when the user is automatically
   *   enabled
   * @return {Promise<String>} promise with target user ID
   */
  async adminDisableUser(userOrUserID, message, expiry) {
    const userID = getUserIDFromParams(userOrUserID);

    let payload = {
      auth_id: userID, // eslint-disable-line camelcase
      disabled: true
    };
    if (message) {
      payload.message = message;
    }
    if (expiry) {
      payload.expiry = expiry.toJSON();
    }

    await this.container.makeRequest('auth:disable:set', payload);
    return userID;
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
      this._setUser(body.result.profile),
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
    return this.container.UserRecord;
  }

  get _Query() {
    return this.container.Query;
  }

}
