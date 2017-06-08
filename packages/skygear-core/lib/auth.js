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
import {EventHandle} from './util';
import {ErrorCodes} from './error';

export const USER_CHANGED = 'userChanged';

export class AuthContainer {
  constructor(container) {
    this.container = container;

    this._accessToken = null;
    this._user = null;
    this._getAccessToken();
  }

  get currentUser() {
    return this._user;
  }

  get accessToken() {
    return this._accessToken;
  }

  onUserChanged(listener) {
    this.container.ee.on(USER_CHANGED, listener);
    return new EventHandle(this.container.ee, USER_CHANGED, listener);
  }

  signupWithUsername(username, password) {
    return this._signup(username, null, password);
  }

  signupWithEmail(email, password) {
    return this._signup(null, email, password);
  }

  signupWithUsernameAndProfile(username, password, profile = {}) {
    return this.signupWithUsername(username, password)
    .then((user)=>
      this._createProfile(user, profile)
    );
  }

  signupWithEmailAndProfile(email, password, profile = {}) {
    return this.signupWithEmail(email, password)
    .then((user)=>
      this._createProfile(user, profile)
    );
  }

  signupAnonymously() {
    return this._signup(null, null, null);
  }

  loginWithUsername(username, password) {
    return this.container.makeRequest('auth:login', {
      username: username,
      password: password
    }).then(this._authResolve.bind(this));
  }

  loginWithEmail(email, password) {
    return this.container.makeRequest('auth:login', {
      email: email,
      password: password
    }).then(this._authResolve.bind(this));
  }

  loginWithProvider(provider, authData) {
    return this.container.makeRequest('auth:login', {
      provider: provider,
      auth_data: authData
    }).then(this._authResolve.bind(this));
  }

  logout() {
    return this.container.push.unregisterDevice()
    .then(()=> {
      this.container.clearCache();
      return this.container.makeRequest('auth:logout', {});
    }, (error)=> {
      if (error.code === ErrorCodes.InvalidArgument &&
          error.message === 'Missing device id'
      ) {
        this.container.clearCache();
        return this.container.makeRequest('auth:logout', {});
      }
      return Promise.reject(error);
    })
    .then(()=> {
      return Promise.all([
        this._setAccessToken(null),
        this._setUser(null)
      ]).then(()=> null);
    }, (err)=> {
      return this._setAccessToken(null).then(()=> {
        return Promise.reject(err);
      });
    });
  }

  whoami() {
    return this.container.makeRequest('me', {})
    .then(this._authResolve.bind(this));
  }

  changePassword(oldPassword, newPassword, invalidate = false) {
    if (invalidate) {
      throw Error('Invalidate is not yet implemented');
    }
    return this.container.makeRequest('auth:password', {
      old_password: oldPassword,
      password: newPassword
    })
    .then(this._authResolve.bind(this));
  }

  saveUser(user) {
    const payload = {
      _id: user.id,     // eslint-disable-line camelcase
      email: user.email,
      username: user.username
    };
    if (user.roles) {
      payload.roles = _.map(user.roles, function (perRole) {
        return perRole.name;
      });
    }
    return this.container.makeRequest('user:update', payload).then((body)=> {
      const newUser = this._User.fromJSON(body.result);
      const currentUser = this.currentUser;

      if (newUser && currentUser && newUser.id === currentUser.id) {
        return this._setUser(body.result);
      } else {
        return newUser;
      }
    });
  }

  getUsersByEmail(emails) {
    return this._getUsersBy(emails, null);
  }

  getUsersByUsername(usernames) {
    return this._getUsersBy(null, usernames);
  }

  discoverUserByEmails(emails) {
    return this.container.publicDB.query(
      new this._Query(this.container.UserRecord).havingEmails(emails)
    );
  }

  discoverUserByUsernames(usernames) {
    return this.container.publicDB.query(
      new this._Query(this.container.UserRecord).havingUsernames(usernames)
    );
  }

  _getAccessToken() {
    return this.container.store.getItem('skygear-accesstoken').then((token)=> {
      this._accessToken = token;
      return token;
    }, (err)=> {
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
    return setItem.then(()=> {
      return value;
    }, (err)=> {
      console.warn('Failed to persist accesstoken', err);
      return value;
    });
  }

  _signup(username, email, password) {
    return this.container.makeRequest('auth:signup', {
      username: username,
      email: email,
      password: password
    }).then(this._authResolve.bind(this));
  }

  _authResolve(body) {
    return Promise.all([
      this._setUser(body.result),
      this._setAccessToken(body.result.access_token)
    ]).then(()=> {
      this.container.pubsub._reconfigurePubsubIfNeeded();
      return this.currentUser;
    });
  }

  _createProfile(user, profile) {
    let record = new this.container.UserRecord({
      _id: 'user/' + user.id,
      ...profile
    });
    return this.container.publicDB.save(record);
  }

  _getUsersBy(emails, usernames) {
    return this.container.makeRequest('user:query', {
      emails: emails,
      usernames: usernames
    }).then((body)=> {
      return body.result.map(r => new this._User(r.data));
    });
  }

  _getUser() {
    return this.container.store.getItem('skygear-user').then((userJSON)=> {
      let attrs = JSON.parse(userJSON);
      this._user = this._User.fromJSON(attrs);
    }, (err)=> {
      console.warn('Failed to get user', err);
      this._user = null;
      return null;
    });
  }

  _setUser(attrs) {
    let value;
    if (attrs !== null) {
      this._user = new this._User(attrs);
      value = JSON.stringify(this._user.toJSON());
    } else {
      this._user = null;
      value = null;
    }

    const setItem = value === null ?
        this.container.store.removeItem('skygear-user') :
        this.container.store.setItem('skygear-user', value);
    return setItem.then(()=> {
      this.container.ee.emit(USER_CHANGED, this._user);
      return value;
    }, (err)=> {
      console.warn('Failed to persist user', err);
      return value;
    });
  }

  get _User() {
    return this.container.User;
  }

  get _Query() {
    return this.container.Query;
  }

}
