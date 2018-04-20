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
              roles: ['Normal-User'],
              profile: {
                _type: 'record', // eslint-disable-line camelcase
                _id: 'user/user-id-1', // eslint-disable-line camelcase
                _access: null, // eslint-disable-line camelcase
                username: 'user1',
                email: 'user1@skygear.dev'
              }
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
      assert.instanceOf(user, container.Record);
      assert.equal(user.id, 'user/user-id-1');
      assert.equal(user.username, 'user1');
      assert.equal(user.email, 'user1@skygear.dev');
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
      const validUser = params['auth_data'] &&
        (params['auth_data']['username'] === 'username' ||
        params['auth_data']['email'] === 'user@email.com');
      if (validUser && params['password'] === 'passwd') {
        return fn({
          'result': {
            'user_id': 'user:id1',
            'access_token': 'uuid1',
            'profile': {
              '_type': 'record', // eslint-disable-line camelcase
              '_id': 'user/user:id1', // eslint-disable-line camelcase
              '_access': null, // eslint-disable-line camelcase
              'username': 'user1',
              'email': 'user1@skygear.io',
              // simulate serialisation and deserialisation by superagent
              ...JSON.parse(JSON.stringify(params['profile'])) || {}
            }
          }
        });
      }
      if (params['auth_data'] &&
        params['auth_data']['username'] === 'duplicated') {
        return fn({
          'error': {
            'type': 'ResourceDuplicated',
            'code': 101,
            'message': 'user duplicated'
          }
        }, 400);
      }
      if (params['auth_data'] === null &&
        params['password'] === null) {

        return fn({
          'result': {
            'user_id': 'user:id2',
            'access_token': 'uuid2',
            'profile': {
              '_type': 'record', // eslint-disable-line camelcase
              '_id': 'user/user:id2', // eslint-disable-line camelcase
              '_access': null, // eslint-disable-line camelcase
              'username': 'user2',
              'email': 'user2@skygear.io'
            }
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
            'provider_auth_data': params['provider_auth_data'],
            'profile': {
              '_type': 'record', // eslint-disable-line camelcase
              '_id': 'user/user:id1', // eslint-disable-line camelcase
              '_access': null // eslint-disable-line camelcase
            }
          }
        });
      }
      const validUser = params['auth_data']['username'] === 'registered' ||
        params['auth_data']['email'] === 'user@email.com';
      if (validUser && params['password'] === 'passwd') {
        return fn({
          'result': {
            'user_id': 'user:id1',
            'access_token': 'uuid1',
            'profile': {
              '_type': 'record', // eslint-disable-line camelcase
              '_id': 'user/user:id1', // eslint-disable-line camelcase
              '_access': null, // eslint-disable-line camelcase
              'username': 'user1',
              'email': 'user1@skygear.io'
            }
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
            'profile': {
              '_type': 'record', // eslint-disable-line camelcase
              '_id': 'user/user:id1', // eslint-disable-line camelcase
              '_access': null // eslint-disable-line camelcase
            }
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

  it('_getUser should set _user=null with missing store key', function () {
    container.auth._user = new container.UserRecord();
    container.store.removeItem('skygear-user')
    .then(() => {
      return container.auth._getUser();
    })
    .then(() => {
      assert.isNull(container.auth.currentUser);
    });
  });


  it('_setUser should set _user=null with null attrs', function () {
    container.auth._user = new container.UserRecord();
    container.auth._setUser(null)
    .then(() => {
      assert.isNull(container.auth.currentUser);
    });
  });

  it('_setUser should set _user=null with undefined attrs', function () {
    container.auth._user = new container.UserRecord();
    container.auth._setUser(undefined)
    .then(() => {
      assert.isNull(container.auth.currentUser);
    });
  });

  it('should serialize and deserlize user correctly', function () {
    const userAttrs = {
      _id: 'user/user1',
      name: 'user1',
      age: 100
    };
    return container.auth._setUser(userAttrs)
    .then(() => {
      assert.instanceOf(container.auth.currentUser, container.Record);
      assert.equal(container.auth.currentUser.id, 'user/user1');
      assert.equal(container.auth.currentUser.name, 'user1');
      assert.equal(container.auth.currentUser.age, 100);

      return container.auth._getUser();
    })
    .then(() => {
      assert.instanceOf(container.auth.currentUser, container.Record);
      assert.equal(container.auth.currentUser.id, 'user/user1');
      assert.equal(container.auth.currentUser.name, 'user1');
      assert.equal(container.auth.currentUser.age, 100);
    });
  });

  it('should signup with profile successfully', function () {
    return container.auth
      .signup({
        username: 'username',
        email: 'user@email.com'
      }, 'passwd', {
        age: 100
      })
      .then(function (user) {
        assert.equal(
          container.auth.accessToken,
          'uuid1');
        assert.instanceOf(container.auth.currentUser, container.Record);
        assert.equal(
          container.auth.currentUser.id,
          'user/user:id1'
        );
        assert.equal(container.auth.currentUser.age, 100);
      });
  });

  it('should signup with date in profile successfully', function () {
    return container.auth
      .signup({
        username: 'username',
        email: 'user@email.com'
      }, 'passwd', {
        birthday: new Date(0)
      })
      .then(function (user) {
        assert.equal(
          container.auth.accessToken,
          'uuid1');
        assert.instanceOf(container.auth.currentUser, container.Record);
        assert.equal(
          container.auth.currentUser.id,
          'user/user:id1'
        );
        assert.equal(
          container.auth.currentUser.birthday.getTime(),
          0
        );
      });
  });

  it('should signup with username successfully', function () {
    return container.auth
      .signupWithUsername('username', 'passwd')
      .then(function (user) {
        assert.equal(
          container.auth.accessToken,
          'uuid1');
        assert.instanceOf(container.auth.currentUser, container.Record);
        assert.equal(
          container.auth.currentUser.id,
          'user/user:id1'
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
        assert.instanceOf(container.auth.currentUser, container.Record);
        assert.equal(
          container.auth.currentUser.id,
          'user/user:id1'
        );
      });
  });

  it('should signup anonymously', function () {
    return container.auth
      .signupAnonymously()
      .then(function (user) {
        assert.equal(
          container.auth.accessToken,
          'uuid2');
        assert.instanceOf(container.auth.currentUser, container.Record);
        assert.equal(
          container.auth.currentUser.id,
          'user/user:id2'
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
        assert.instanceOf(container.auth.currentUser, container.Record);
        assert.equal(
          container.auth.currentUser.id,
          'user/user:id1'
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
        assert.instanceOf(container.auth.currentUser, container.Record);
        assert.equal(
          container.auth.currentUser.id,
          'user/user:id1'
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
        assert.instanceOf(container.auth.currentUser, container.Record);
        assert.equal(
          container.auth.currentUser.id,
          'user/user:id1'
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

  it('should clear current user and access token if logout fail', function () {
    /* eslint-disable camelcase */
    const aUserAttr = {
      user_id: '68a2e6ce-9321-4561-8042-a8fa076e9214',
      email: 'sky.user@skygear.dev',
      access_token: 'a43c8583-3ac8-496a-8cb4-8f1b0fde1c5b'
    };

    container.push.unregisterDevice = () => {
      return Promise.reject({
        code: 10000,
        message: 'unknown error'
      });
    };

    return Promise.all([
      container.auth._setAccessToken(aUserAttr.access_token),
      container.auth._setUser(aUserAttr)
    ])
    .then(() => {
      assert.equal(container.auth.accessToken, aUserAttr.access_token);
      assert.isNotNull(container.auth.currentUser);

      return container.auth.logout();
    })
    .then(() => {
      assert.equal(true, false);
    }, () => {
      assert.isNull(container.auth.accessToken);
      assert.isNull(container.auth.currentUser);
    });
    /* eslint-enable-line camelcase */
  });

  it('should change password successfully', function () {
    return container.auth
      .changePassword('supersecret', 'supersecret')
      .then(function (user) {
        assert.equal(container.auth.accessToken, 'uuid1');
        assert.instanceOf(container.auth.currentUser, container.Record);
        assert.equal(container.auth.currentUser.id, 'user/user:id1');
        assert.instanceOf(user, container.Record);
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

describe('AuthContainer', function () {
  let container = new Container();
  container.pubsub.autoPubsub = false;
  container.configApiKey('correctApiKey');
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/auth/disable/set',
    fixtures: function (match, params, headers, fn) {
      if (params.auth_id === 'some-uuid1') {
        assert.isFalse(params.disabled);
      } else if (params.auth_id === 'some-uuid2') {
        assert.isTrue(params.disabled);
        assert.equal(params.message, 'some reason');
        assert.equal(params.expiry, '2014-09-27T17:40:00.000Z');
      } else if (params.auth_id === 'some-uuid3') {
        assert.isTrue(params.disabled);
      } else {
        assert.fail(params.auth_id);
      }
      return fn({
        'result': {
          'status': 'OK'
        }
      });
    }
  }]);

  it('adminEnableUser should send auth:disable:set', function () {
    return container.auth.adminEnableUser('some-uuid1')
    .then((userID) => {
      assert.equal(userID, 'some-uuid1');
    }, (err) => {
      assert.fail(err);
    });
  });

  it('adminDisableUser should send auth:disable:set', function () {
    return container.auth.adminDisableUser(
      'some-uuid2',
      'some reason',
      new Date('2014-09-27T17:40:00.000Z')
    )
    .then((userID) => {
      assert.equal(userID, 'some-uuid2');
    }, (err) => {
      assert.fail(err);
    });
  });

  it(
    'adminDisableUser should send auth:disable:set without optional fields',
    function () {
      return container.auth.adminDisableUser('some-uuid3')
      .then((userID) => {
        assert.equal(userID, 'some-uuid3');
      }, (err) => {
        assert.fail(err);
      });
    }
  );
});
/*eslint-enable dot-notation, no-unused-vars, quote-props */
