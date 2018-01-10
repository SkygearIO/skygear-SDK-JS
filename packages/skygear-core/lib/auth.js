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
const _ = require('lodash');

import {EventHandle} from './util';
import {ErrorCodes} from './error';
import Role from './role';

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
  signup(authData, password, data = {}) {
    return this.container.makeRequest('auth:signup', {
      auth_data: authData, // eslint-disable-line camelcase
      password: password,
      profile: data
    }).then(this._authResolve.bind(this));
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
  signupWithUsername(username, password, data = {}) {
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
  signupWithEmail(email, password, data = {}) {
    return this.signup({
      email: email
    }, password, data);
  }

  /**
   * Creates an anonymous user account and log in as the created user.
   *
   * @return {Promise<Record>} promise with the created user record
   */
  signupAnonymously() {
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
  login(authData, password) {
    return this.container.makeRequest('auth:login', {
      auth_data: authData, // eslint-disable-line camelcase
      password: password
    }).then(this._authResolve.bind(this));
  }

  /**
   * Logs in to an existing user account with the specified username and
   * password.
   *
   * @param  {String} username - username of the user
   * @param  {String} password - password of the user
   * @return {Promise<Record>} promise with the logged in user record
   */
  loginWithUsername(username, password) {
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
  loginWithEmail(email, password) {
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
  loginWithProvider(provider, authData) {
    return this.container.makeRequest('auth:login', {
      provider: provider,
      provider_auth_data: authData // eslint-disable-line camelcase
    }).then(this._authResolve.bind(this));
  }

  /**
   * Logs out the current user of this container.
   *
   * @return {Promise} promise
   */
  logout() {
    return this.container.push.unregisterDevice()
    .catch((error) => {
      if (error.code === ErrorCodes.InvalidArgument &&
          error.message === 'Missing device id'
      ) {
        return Promise.resolve();
      }

      return Promise.reject(error);
    })
    .then(() => {
      this.container.clearCache();
      return this.container.makeRequest('auth:logout', {});
    })
    .then(() => {
      return Promise.all([
        this._setAccessToken(null),
        this._setUser(null)
      ]).then(() => null);
    })
    .catch((err) => {
      return this._setAccessToken(null).then(() => {
        return Promise.reject(err);
      });
    });
  }

  /**
   * Retrieves current user record from server.
   *
   * @return {Promise<Record>} promise with current user record
   */
  whoami() {
    return this.container.makeRequest('me', {})
    .then(this._authResolve.bind(this));
  }

  /**
   * Changes the password of the current user.
   *
   * @param  {String}  oldPassword - old password of current user
   * @param  {String}  newPassword - new password of current user
   * @param  {Boolean} [invalidate=false] - not implemented
   * @return {Promise<Record>} promise with current user record
   */
  changePassword(oldPassword, newPassword, invalidate = false) {
    if (invalidate) {
      throw Error('Invalidate is not yet implemented');
    }
    return this.container.makeRequest('auth:password', {
      old_password: oldPassword, // eslint-disable-line camelcase
      password: newPassword
    })
    .then(this._authResolve.bind(this));
  }

  /**
   * Defines roles to have admin right.
   *
   * @param {Role[]} roles - roles to have admin right
   * @return {Promise<String[]>} promise with role names
   */
  setAdminRole(roles) {
    let roleNames = _.map(roles, function (perRole) {
      return perRole.name;
    });

    return this.container.makeRequest('role:admin', {
      roles: roleNames
    }).then((body) => body.result);
  }

  /**
   * Sets default roles for new registered users.
   *
   * @param {Role[]} roles - default roles
   * @return {Promise<String[]>} promise with role names
   */
  setDefaultRole(roles) {
    let roleNames = _.map(roles, function (perRole) {
      return perRole.name;
    });

    return this.container.makeRequest('role:default', {
      roles: roleNames
    }).then((body) => body.result);
  }

  /**
   * Gets roles of users from server.
   *
   * @param  {Record[]|String[]} users - user records or user ids
   * @return {Promise<Object>} promise with userIDs-to-roles map
   */
  fetchUserRole(users) {
    let userIds = _.map(users, function (perUser) {
      // accept either user record or user id
      return perUser._id || perUser;
    });

    return this.container.makeRequest('role:get', {
      users: userIds
    })
    .then((body) =>
      Object.keys(body.result)
      .map((key) => [key, body.result[key]])
      .reduce((acc, pairs) => ({
        ...acc || {},
        [pairs[0]]: pairs[1].map((name) => new Role(name))
      }), null)
    );
  }

  /**
   * Assigns roles to users.
   *
   * @param  {Record[]|String[]} users - target users
   * @param  {Role[]|String[]} roles - roles to be assigned
   * @return {Promise<String[]>} proimse with the target users
   */
  assignUserRole(users, roles) {
    let userIds = _.map(users, function (perUser) {
      // accept either user record or user id
      return perUser._id || perUser;
    });

    let roleNames = _.map(roles, function (perRole) {
      // accept either role object or role name
      return perRole.name || perRole;
    });

    return this.container.makeRequest('role:assign', {
      users: userIds,
      roles: roleNames
    }).then((body) => body.result);
  }

  /**
   * Revokes roles from users.
   *
   * @param  {Record[]|String[]} users - target users
   * @param  {Role[]|String[]} roles - roles to be revoked
   * @return {Promise<String[]>} promise with target users
   */
  revokeUserRole(users, roles) {
    let userIds = _.map(users, function (perUser) {
      // accept either user record or user id
      return perUser._id || perUser;
    });

    let roleNames = _.map(roles, function (perRole) {
      // accept either role object or role name
      return perRole.name || perRole;
    });

    return this.container.makeRequest('role:revoke', {
      users: userIds,
      roles: roleNames
    }).then((body) => body.result);
  }

  _getAccessToken() {
    return this.container.store.getItem('skygear-accesstoken').then((token) => {
      this._accessToken = token;
      return token;
    }, (err) => {
      console.warn('Failed to get access', err);
      this._accessToken = null;
      return null;
    });
  }

  _setAccessToken(value) {
    this._accessToken = value;
    const setItem = value === null
        ? this.container.store.removeItem('skygear-accesstoken')
        : this.container.store.setItem('skygear-accesstoken', value);
    return setItem.then(() => {
      return value;
    }, (err) => {
      console.warn('Failed to persist accesstoken', err);
      return value;
    });
  }

  _authResolve(body) {
    return Promise.all([
      this._setUser(body.result.profile),
      this._setAccessToken(body.result.access_token)
    ]).then(() => {
      this.container.pubsub._reconfigurePubsubIfNeeded();
      return this.currentUser;
    });
  }

  _getUser() {
    return this.container.store.getItem('skygear-user').then((userJSON) => {
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
    }).catch((err) => {
      console.warn('Failed to get user', err);
      this._user = null;
      return null;
    });
  }

  _setUser(attrs) {
    let value;
    if (attrs) {
      this._user = new this._User(attrs);
      value = JSON.stringify(this._user.toJSON());
    } else {
      this._user = null;
      value = null;
    }

    const setItem = value === null ?
        this.container.store.removeItem('skygear-user') :
        this.container.store.setItem('skygear-user', value);
    return setItem.then(() => {
      this.container.ee.emit(USER_CHANGED, this._user);
      return value;
    }, (err) => {
      console.warn('Failed to persist user', err);
      return value;
    });
  }

  get _User() {
    return this.container.UserRecord;
  }

  get _Query() {
    return this.container.Query;
  }

}
