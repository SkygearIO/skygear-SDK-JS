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
/*eslint-disable camelcase, dot-notation, no-unused-vars, quote-props */
import {assert, expect} from 'chai';
import Container from '../lib/container';

import mockSuperagent from './mock/superagent';

describe('Container me', function () {
  let container = new Container();
  container.configApiKey('correctApiKey');
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/auth/me',
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
                _recordType: 'user', // eslint-disable-line camelcase
                _recordID: 'user-id-1', // eslint-disable-line camelcase
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

  it('should get me correctly', async function () {
    container.auth._accessToken = 'token-1';
    const user = await container.auth.whoami();
    assert.instanceOf(user, container.Record);
    assert.equal(user.recordType, 'user');
    assert.equal(user.recordID, 'user-id-1');
    assert.equal(user.username, 'user1');
    assert.equal(user.email, 'user1@skygear.dev');
  });

  it('should handle error properly', async function () {
    container.auth._accessToken = null;
    try {
      const user = await container.auth.whoami();
      assert.fail('should fail');
    } catch (err) {
      assert.isNotNull(err);
    }
  });
});

describe('Container auth', function () {
  let container = new Container();
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/auth/signup',
    fixtures: function (match, params, headers, fn) {
      const validUser = params['auth_data'] &&
        (params['auth_data']['username'] === 'username' ||
        params['auth_data']['email'] === 'user@email.com');
      if (validUser && params['password'] === 'passwd') {
        return fn({
          result: {
            user_id: 'user:id1',
            access_token: 'uuid1',
            profile: {
              _type: 'record', // eslint-disable-line camelcase
              _recordType: 'user', // eslint-disable-line camelcase
              _recordID: 'user:id1', // eslint-disable-line camelcase
              _access: null, // eslint-disable-line camelcase
              username: 'user1',
              email: 'user1@skygear.io',
              // simulate serialisation and deserialisation by superagent
              ...JSON.parse(JSON.stringify(params['profile'])) || {}
            }
          }
        });
      }
      if (params['auth_data'] &&
        params['auth_data']['username'] === 'duplicated') {
        return fn({
          error: {
            type: 'ResourceDuplicated',
            code: 101,
            message: 'user duplicated'
          }
        }, 400);
      }
      if (params['auth_data'] === null &&
        params['password'] === null) {

        return fn({
          result: {
            user_id: 'user:id2',
            access_token: 'uuid2',
            profile: {
              _type: 'record', // eslint-disable-line camelcase
              _recordType: 'user', // eslint-disable-line camelcase
              _recordID: 'user:id2', // eslint-disable-line camelcase
              _access: null, // eslint-disable-line camelcase
              username: 'user2',
              email: 'user2@skygear.io'
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
          result: {
            user_id: 'user:id1',
            access_token: 'uuid1',
            provider_auth_data: params['provider_auth_data'],
            profile: {
              _type: 'record', // eslint-disable-line camelcase
              _recordType: 'user', // eslint-disable-line camelcase
              _recordID: 'user:id1', // eslint-disable-line camelcase
              _access: null // eslint-disable-line camelcase
            }
          }
        });
      }
      const validUser = params['auth_data']['username'] === 'registered' ||
        params['auth_data']['email'] === 'user@email.com';
      if (validUser && params['password'] === 'passwd') {
        return fn({
          result: {
            user_id: 'user:id1',
            access_token: 'uuid1',
            profile: {
              _type: 'record', // eslint-disable-line camelcase
              _recordType: 'user', // eslint-disable-line camelcase
              _recordID: 'user:id1', // eslint-disable-line camelcase
              _access: null, // eslint-disable-line camelcase
              username: 'user1',
              email: 'user1@skygear.io'
            }
          }
        });
      }
      return fn({
        error: {
          type: 'AuthenticationError',
          code: 102,
          message: 'invalid authentication information'
        }
      }, 400);
    }
  }, {
    pattern: 'http://skygear.dev/auth/change_password',
    fixtures: function (match, params, headers, fn) {
      if (params['old_password'] === params['password']) {
        return fn({
          result: {
            user_id: 'user:id1',
            access_token: 'uuid1',
            profile: {
              _type: 'record', // eslint-disable-line camelcase
              _recordType: 'user', // eslint-disable-line camelcase
              _recordID: 'user:id1', // eslint-disable-line camelcase
              _access: null // eslint-disable-line camelcase
            }
          }
        });
      }
      return fn({
        error: {
          type: 'AuthenticationError',
          code: 102,
          message: 'invalid authentication information'
        }
      }, 400);
    }
  }, {
    pattern: 'http://skygear.dev/auth/logout',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: {
          status: 'OK'
        }
      });
    }
  }, {
    pattern: 'http://skygear.dev/device/unregister',
    fixtures: function (match, params, headers, fn) {
      if (params && params.id) {
        return fn({
          result: {
            id: params.id
          }
        });
      } else {
        return fn({
          error: {
            name: 'InvalidArgument',
            code: 108,
            message: 'Missing device id',
            info: {
              arguments: [
                'id'
              ]
            }
          }
        });
      }
    }
  }]);
  container.configApiKey('correctApiKey');

  it(
    '_getUser should set _user=null with missing store key',
    async function () {
      container.auth._user = new container.UserRecord();
      await container.store.removeItem('skygear-user');
      await container.auth._getUser();
      assert.isNull(container.auth.currentUser);
    }
  );


  it('_setUser should set _user=null with null attrs', async function () {
    container.auth._user = new container.UserRecord();
    await container.auth._setUser(null);
    assert.isNull(container.auth.currentUser);
  });

  it('_setUser should set _user=null with undefined attrs', async function () {
    container.auth._user = new container.UserRecord();
    await container.auth._setUser(undefined);
    assert.isNull(container.auth.currentUser);
  });

  it('should serialize and deserlize user correctly', async function () {
    const userAttrs = {
      _recordType: 'user',
      _recordID: 'user1',
      name: 'user1',
      age: 100
    };
    await container.auth._setUser(userAttrs);
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user1');
    assert.equal(container.auth.currentUser.name, 'user1');
    assert.equal(container.auth.currentUser.age, 100);

    await container.auth._getUser();
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user1');
    assert.equal(container.auth.currentUser.name, 'user1');
    assert.equal(container.auth.currentUser.age, 100);
  });

  it('should signup with profile successfully', async function () {
    const user = await container.auth
      .signup({
        username: 'username',
        email: 'user@email.com'
      }, 'passwd', {
        age: 100
      });
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user:id1');
    assert.equal(container.auth.currentUser.age, 100);
  });

  it('should signup with date in profile successfully', async function () {
    const user = await container.auth
      .signup({
        username: 'username',
        email: 'user@email.com'
      }, 'passwd', {
        birthday: new Date(0)
      });
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user:id1');
    assert.equal(
      container.auth.currentUser.birthday.getTime(),
      0
    );
  });

  it('should signup with username successfully', async function () {
    const user = await container.auth.signupWithUsername('username', 'passwd');
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user:id1');
  });

  it('should signup with email successfully', async function () {
    const user = await container.auth
      .signupWithEmail('user@email.com', 'passwd');
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user:id1');
  });

  it('should signup anonymously', async function () {
    const user = await container.auth.signupAnonymously();
    assert.equal(
      container.auth.accessToken,
      'uuid2');
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user:id2');
  });

  it('should not signup duplicate account', async function () {
    try {
      const user = await container.auth
        .signupWithUsername('duplicated', 'passwd');
      assert.fail('should fail');
    } catch (err) {
      assert.equal(err.message, 'user duplicated');
    }
  });

  it('should login with correct password', async function () {
    const user = await container.auth
      .loginWithUsername('registered', 'passwd');
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user:id1');
  });

  it('should login with email and correct password', async function () {
    const user = await container.auth
      .loginWithEmail('user@email.com', 'passwd');
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user:id1');
  });

  it('should fail to login with incorrect password', async function () {
    try {
      const user = await container.auth
        .loginWithUsername('registered', 'wrong');
      assert.fail('should fail');
    } catch (err) {
      assert.equal(
        err.message,
        'invalid authentication information');
    }
  });

  it('should login with provider successfully', async function () {
    const user = await container.auth
      .loginWithProvider('provider', {});
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user:id1');
  });

  it('should be able to set null accessToken', async function () {
    await container.auth._setAccessToken(null);
    assert.equal(container.auth.accessToken, null);
  });

  it(
    'should clear current user and access token after logout',
    async function () {
      /* eslint-disable camelcase */
      const aUserAttr = {
        user_id: '68a2e6ce-9321-4561-8042-a8fa076e9214',
        email: 'sky.user@skygear.dev',
        access_token: 'a43c8583-3ac8-496a-8cb4-8f1b0fde1c5b'
      };

      await Promise.all([
        container.auth._setAccessToken(aUserAttr.access_token),
        container.auth._setUser(aUserAttr)
      ]);
      assert.equal(container.auth.accessToken, aUserAttr.access_token);
      assert.isNotNull(container.auth.currentUser, aUserAttr.currentUser);

      await container.auth.logout();
      assert.isNull(container.auth.accessToken, aUserAttr.access_token);
      assert.isNull(container.auth.currentUser, aUserAttr.currentUser);
      /* eslint-enable-line camelcase */
    }
  );

  it(
    'should clear current user and access token if logout fail',
    async function () {
      /* eslint-disable camelcase */
      const aUserAttr = {
        user_id: '68a2e6ce-9321-4561-8042-a8fa076e9214',
        email: 'sky.user@skygear.dev',
        access_token: 'a43c8583-3ac8-496a-8cb4-8f1b0fde1c5b'
      };

      container.push.unregisterDevice = async () => {
        throw {
          code: 10000,
          message: 'unknown error'
        };
      };

      try {
        await Promise.all([
          container.auth._setAccessToken(aUserAttr.access_token),
          container.auth._setUser(aUserAttr)
        ]);
        assert.equal(container.auth.accessToken, aUserAttr.access_token);
        assert.isNotNull(container.auth.currentUser);

        await container.auth.logout();
        assert.equal(true, false);
      } catch (err) {
        // do nothing
      } finally {
        assert.isNull(container.auth.accessToken);
        assert.isNull(container.auth.currentUser);
      }
      /* eslint-enable-line camelcase */
    }
  );

  it('should change password successfully', async function () {
    const user = await container.auth
      .changePassword('supersecret', 'supersecret');
    assert.equal(container.auth.accessToken, 'uuid1');
    assert.instanceOf(container.auth.currentUser, container.Record);
    assert.equal(container.auth.currentUser.recordType, 'user');
    assert.equal(container.auth.currentUser.recordID, 'user:id1');
    assert.instanceOf(user, container.Record);
  });

  it('should fail to change password if not match', async function () {
    try {
      const user = await container.auth
        .changePassword('supersecret', 'wrongsecret');
      assert.fail('should fail');
    } catch (error) {
      assert.equal(error.message, 'invalid authentication information');
    }
  });
});

describe('AuthContainer', function () {
  let container = new Container();
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

  it('adminEnableUser should send auth:disable:set', async function () {
    const userID = await container.auth.adminEnableUser('some-uuid1');
    assert.equal(userID, 'some-uuid1');
  });

  it('adminDisableUser should send auth:disable:set', async function () {
    const userID = await container.auth.adminDisableUser(
      'some-uuid2',
      'some reason',
      new Date('2014-09-27T17:40:00.000Z')
    );
    assert.equal(userID, 'some-uuid2');
  });

  it(
    'adminDisableUser should send auth:disable:set without optional fields',
    async function () {
      const userID = await container.auth.adminDisableUser('some-uuid3');
      assert.equal(userID, 'some-uuid3');
    }
  );
});
/*eslint-enable camelcase, dot-notation, no-unused-vars, quote-props */
