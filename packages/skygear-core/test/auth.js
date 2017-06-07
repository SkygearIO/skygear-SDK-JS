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
/*eslint-disable dot-notation, no-unused-vars, quote-props */
import {assert, expect} from 'chai';
import Container from '../lib/container';

import mockSuperagent from './mock/superagent';

describe('Container me', function () {
  let container = new Container();
  container.pubsub.autoPubsub = false;
  container.configApiKey('correctApiKey');
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/me',
    fixtures: function (match, params, headers, fn) {
      const token = params['access_token'];
      if (token) {
        if (token === 'token-1') {
          return fn({
            result: {
              user_id: 'user-id-1', // eslint-disable-line camelcase
              username: 'user1',
              email: 'user1@skygear.dev',
              roles: ['Normal-User']
            }
          });
        }
      } else {
        return fn({
          error: {
            name: 'NotAuthenticated',
            code: 101,
            message: 'Authentication is needed to get current user'
          }
        });
      }
    }
  }]);

  it('should get me correctly', function () {
    container.auth._accessToken = 'token-1';
    return container.auth.whoami()
    .then(function (user) {
      assert.instanceOf(user, container.User);
      assert.equal(user.id, 'user-id-1');
      assert.equal(user.username, 'user1');
      assert.equal(user.email, 'user1@skygear.dev');

      assert.lengthOf(user.roles, 1);
      assert.equal(user.roles[0], container.Role.define('Normal-User'));
    }, function (err) {
      throw new Error('Get me fail');
    });
  });

  it('should handle error properly', function () {
    container.auth._accessToken = null;
    return container.auth.whoami()
    .then(function (user) {
      throw new Error('Should not get me without access token');
    }, function (err) {
      assert.isNotNull(err);
    });
  });
});

describe('Container auth', function () {
  let container = new Container();
  container.pubsub.autoPubsub = false;
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/auth/signup',
    fixtures: function (match, params, headers, fn) {
      const validUser = params['username'] === 'username' ||
        params['email'] === 'user@email.com';
      if (validUser && params['password'] === 'passwd') {
        return fn({
          'result': {
            'user_id': 'user:id1',
            'access_token': 'uuid1',
            'username': 'user1',
            'email': 'user1@skygear.io'
          }
        });
      }
      if (params['username'] === 'duplicated') {
        return fn({
          'error': {
            'type': 'ResourceDuplicated',
            'code': 101,
            'message': 'user duplicated'
          }
        }, 400);
      }
      if (params['username'] === null &&
        params['password'] === null &&
        params['email'] === null) {

        return fn({
          'result': {
            'user_id': 'user:id2',
            'access_token': 'uuid2',
            'username': 'user2',
            'email': 'user2@skygear.io'
          }
        });
      }
    }
  }, {
    pattern: 'http://skygear.dev/auth/login',
    fixtures: function (match, params, headers, fn) {
      if (params['provider'] === 'provider') {
        return fn({
          'result': {
            'user_id': 'user:id1',
            'access_token': 'uuid1',
            'username': '',
            'email': '',
            'auth_data': params['auth_data']
          }
        });
      }
      const validUser = params['username'] === 'registered' ||
        params['email'] === 'user@email.com';
      if (validUser && params['password'] === 'passwd') {
        return fn({
          'result': {
            'user_id': 'user:id1',
            'access_token': 'uuid1',
            'username': 'user1',
            'email': 'user1@skygear.io'
          }
        });
      }
      return fn({
        'error': {
          'type': 'AuthenticationError',
          'code': 102,
          'message': 'invalid authentication information'
        }
      }, 400);
    }
  }, {
    pattern: 'http://skygear.dev/auth/password',
    fixtures: function (match, params, headers, fn) {
      if (params['old_password'] === params['password']) {
        return fn({
          'result': {
            'user_id': 'user:id1',
            'access_token': 'uuid1',
            'username': '',
            'email': ''
          }
        });
      }
      return fn({
        'error': {
          'type': 'AuthenticationError',
          'code': 102,
          'message': 'invalid authentication information'
        }
      }, 400);
    }
  }, {
    pattern: 'http://skygear.dev/auth/logout',
    fixtures: function (match, params, headers, fn) {
      return fn({
        'result': {
          'status': 'OK'
        }
      });
    }
  }, {
    pattern: 'http://skygear.dev/device/unregister',
    fixtures: function (match, params, headers, fn) {
      if (params && params.id) {
        return fn({
          'result': {
            'id': params.id
          }
        });
      } else {
        return fn({
          'error': {
            'name': 'InvalidArgument',
            'code': 108,
            'message': 'Missing device id',
            'info': {
              'arguments': [
                'id'
              ]
            }
          }
        });
      }
    }
  }]);
  container.configApiKey('correctApiKey');

  it('should signup successfully', function () {
    return container.auth
      .signupWithUsername('username', 'passwd')
      .then(function (user) {
        assert.equal(
          container.auth.accessToken,
          'uuid1');
        assert.instanceOf(container.auth.currentUser, container.User);
        assert.equal(
          container.auth.currentUser.id,
          'user:id1'
        );
      });
  });

  it('should signup with email successfully', function () {
    return container.auth
      .signupWithEmail('user@email.com', 'passwd')
      .then(function (user) {
        assert.equal(
          container.auth.accessToken,
          'uuid1');
        assert.instanceOf(container.auth.currentUser, container.User);
        assert.equal(
          container.auth.currentUser.id,
          'user:id1'
        );
      });
  });

  it('should signup with profile successfully', function () {
    return container.auth
      .signupWithUsernameAndProfile('username', 'passwd', {
        'key': 'value'
      })
      .then(function (profile) {
        assert.equal(
          container.auth.accessToken,
          'uuid1');
        assert.instanceOf(container.auth.currentUser, container.User);
        assert.equal(
          container.auth.currentUser.id,
          'user:id1'
        );
        assert.equal(profile.key, 'value');
      });
  });

  it('should signup with email and profile successfully', function () {
    return container.auth
      .signupWithEmailAndProfile('user@email.com', 'passwd', {
        'key': 'value'
      })
      .then(function (profile) {
        assert.equal(
          container.auth.accessToken,
          'uuid1');
        assert.instanceOf(container.auth.currentUser, container.User);
        assert.equal(
          container.auth.currentUser.id,
          'user:id1'
        );
        assert.equal(profile.key, 'value');
      });
  });

  it('should signup anonymously', function () {
    return container.auth
      .signupAnonymously()
      .then(function (user) {
        assert.equal(
          container.auth.accessToken,
          'uuid2');
        assert.instanceOf(container.auth.currentUser, container.User);
        assert.equal(
          container.auth.currentUser.id,
          'user:id2'
        );
      });
  });

  it('should not signup duplicate account', function () {
    return container.auth
      .signupWithUsername('duplicated', 'passwd')
      .then(function (user) {
        throw new Error('Signup duplicated user');
      }, function (err) {
        assert.equal(
          err.error.message,
          'user duplicated');
      });
  });

  it('should login with correct password', function () {
    return container.auth
      .loginWithUsername('registered', 'passwd')
      .then(function (user) {
        assert.equal(
          container.auth.accessToken,
          'uuid1');
        assert.instanceOf(container.auth.currentUser, container.User);
        assert.equal(
          container.auth.currentUser.id,
          'user:id1'
        );
      }, function (error) {
        throw new Error('Failed to login with correct password');
      });
  });

  it('should login with email and correct password', function () {
    return container.auth
      .loginWithEmail('user@email.com', 'passwd')
      .then(function (user) {
        assert.equal(
          container.auth.accessToken,
          'uuid1');
        assert.instanceOf(container.auth.currentUser, container.User);
        assert.equal(
          container.auth.currentUser.id,
          'user:id1'
        );
      }, function (error) {
        throw new Error('Failed to login with correct password');
      });
  });

  it('should fail to login with incorrect password', function () {
    return container.auth
      .loginWithUsername('registered', 'wrong')
      .then(function (user) {
        throw new Error('Login with wrong password');
      }, function (err) {
        assert.equal(
          err.error.message,
          'invalid authentication information');
      });
  });

  it('should login with provider successfully', function () {
    return container.auth
      .loginWithProvider('provider', {})
      .then(function (user) {
        assert.equal(
          container.auth.accessToken,
          'uuid1');
        assert.instanceOf(container.auth.currentUser, container.User);
        assert.equal(
          container.auth.currentUser.id,
          'user:id1'
        );
      }, function () {
        throw new Error('Failed to login with provider');
      });
  });

  it('should be able to set null accessToken', function () {
    return container.auth._setAccessToken(null)
    .then(function () {
      assert.equal(container.auth.accessToken, null);
    });
  });

  it('should clear current user and access token after logout', function () {
    /* eslint-disable camelcase */
    const aUserAttr = {
      user_id: '68a2e6ce-9321-4561-8042-a8fa076e9214',
      email: 'sky.user@skygear.dev',
      access_token: 'a43c8583-3ac8-496a-8cb4-8f1b0fde1c5b'
    };

    return Promise.all([
      container.auth._setAccessToken(aUserAttr.access_token),
      container.auth._setUser(aUserAttr)
    ])
    .then(() => {
      assert.equal(container.auth.accessToken, aUserAttr.access_token);
      assert.isNotNull(container.auth.currentUser, aUserAttr.currentUser);

      return container.auth.logout();
    })
    .then(() => {
      assert.isNull(container.auth.accessToken, aUserAttr.access_token);
      assert.isNull(container.auth.currentUser, aUserAttr.currentUser);
    });
    /* eslint-enable-line camelcase */
  });

  it('should change password successfully', function () {
    return container.auth
      .changePassword('supersecret', 'supersecret')
      .then(function (user) {
        assert.equal(container.auth.accessToken, 'uuid1');
        assert.instanceOf(container.auth.currentUser, container.User);
        assert.equal(container.auth.currentUser.id, 'user:id1');
        assert.instanceOf(user, container.User);
      }, function (error) {
        throw new Error('Failed to change password');
      });
  });

  it('should fail to change password if not match', function () {
    return container.auth
      .changePassword('supersecret', 'wrongsecret')
      .then(function (user) {
        throw new Error('Change password when not match');
      }, function (error) {
        assert.equal(error.error.message, 'invalid authentication information');
      });
  });
});

describe('Container users', function () {
  let container = new Container();
  container.request = mockSuperagent([
    {
      pattern: 'http://skygear.dev/user/query',
      fixtures: function (match, params, headers, fn) {
        const emailMatch =
          params['emails'] && params['emails'][0] === 'user1@skygear.io';
        const usernameMatch =
          params['usernames'] && params['usernames'][0] === 'user1';
        if (emailMatch || usernameMatch) {
          return fn({
            'result': [{
              data: {
                _id: 'user:id',
                email: 'user1@skygear.io',
                username: 'user1'
              },
              id: 'user:id',
              type: 'user'
            }]
          });
        }
      }
    }, {
      pattern: 'http://skygear.dev/user/update',
      fixtures: function (match, params, headers, fn) {
        /* eslint-disable camelcase */
        let user_id = params['_id'];
        if (user_id === 'user2_id') {
          let roles = params.roles ? params.roles : ['existing'];
          return fn({
            'result': {
              _id: params._id,
              username: params.username,
              email: params.email,
              roles: roles
            }
          });
        } else if (user_id === 'current_user') {
          return fn({
            result: {
              _id: 'current_user',
              email: 'current_user_new_email@skygear.io',
              username: 'current_user_name'
            }
          });
        }
        /* eslint-enable camelcase */
      }
    }
  ]);
  container.configApiKey('correctApiKey');

  it('query user with email successfully', function () {
    return container.auth
      .getUsersByEmail(['user1@skygear.io'])
      .then(function (users) {
        assert.instanceOf(users[0], container.User);
        assert.equal(
          users[0].id,
          'user:id'
        );
        assert.equal(
          users[0].username,
          'user1'
        );
      }, function () {
        throw new Error('getUsersByEmail failed');
      });
  });

  it('query user with username successfully', function () {
    return container.auth
      .getUsersByUsername(['user1'])
      .then(function (users) {
        assert.instanceOf(users[0], container.User);
        assert.equal(
          users[0].id,
          'user:id'
        );
        assert.equal(
          users[0].username,
          'user1'
        );
      }, function () {
        throw new Error('getUsersByUsername failed');
      });
  });

  it('should be able to set null user', function () {
    return container.auth._setUser(null).then(function () {
      assert.isNull(container.auth.currentUser);
    });
  });

  it('update user record', function () {
    let payload = {
      /* eslint-disable camelcase */
      _id: 'user2_id',
      /* eslint-enable camelcase */
      username: 'user2',
      email: 'user2@skygear.io',
      roles: ['Tester']
    };

    let Tester = container.Role.define('Tester');
    let Developer = container.Role.define('Developer');

    let user = container.User.fromJSON(payload);
    let newUsername = 'user2-new';
    let newEmail = 'user2-new@skygear.io';

    user.username = newUsername;
    user.email = newEmail;
    user.addRole(Developer);

    return container.auth.saveUser(user)
    .then(function (updatedUser) {
      assert.equal(updatedUser.id, user.id);
      assert.equal(updatedUser.username, newUsername);
      assert.equal(updatedUser.email, newEmail);

      assert.equal(updatedUser.hasRole(Tester), true);
      assert.equal(updatedUser.hasRole(Developer), true);
    }, function (err) {
      throw new Error('update user record error', JSON.stringify(err));
    });
  });

  it('update user record without update role', function () {
    let payload = {
      /* eslint-disable camelcase */
      id: 'user2_id',
      /* eslint-enable camelcase */
      email: 'user2@skygear.io'
    };

    let Existing = container.Role.define('existing');
    let Developer = container.Role.define('Developer');

    let newEmail = 'user2-new@skygear.io';

    payload.email = newEmail;

    return container.auth.saveUser(payload)
    .then(function (updatedUser) {
      assert.equal(updatedUser.id, payload.id);
      assert.equal(updatedUser.email, newEmail);
      console.warn('roles', updatedUser.roles);
      assert.equal(updatedUser.hasRole(Existing), true);
      assert.equal(updatedUser.hasRole(Developer), false);
    }, function (err) {
      throw new Error('update user record error', JSON.stringify(err));
    });
  });

  it('should able to update current user', function () {
    let payload = {
      _id: 'current_user',
      email: 'current_user@skygear.io',
      username: 'current_user_name'
    };

    container.auth._user = container.User.fromJSON(payload);

    let user = container.User.fromJSON(payload);
    user.email = 'current_user_new_email@skygear.io';

    return container.auth.saveUser(user)
    .then(function () {
      assert.equal(container.auth.currentUser.email, user.email);
    }, function (err) {
      console.error(err);
      throw new Error('update current user error', JSON.stringify(err));
    });
  });
});
/*eslint-enable dot-notation, no-unused-vars, quote-props */
