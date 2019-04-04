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
import {assert} from 'chai';
import Container from '../lib/container';

import mockSuperagent from './mock/superagent';

describe('Container me', function () {
  let container = new Container();
  container.configApiKey('correctApiKey');
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/_auth/me',
    fixtures: function (match, params, headers, fn) {
      const token = params['access_token'];
      if (token) {
        if (token === 'token-1') {
          return fn({
            result: {
              user_id: 'user-id-1', // eslint-disable-line camelcase
              login_ids: {
                username: 'user1',
                email: 'user1@skygear.dev'
              },
              metadata: {}
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
    assert.instanceOf(user, container.User);
    assert.equal(user.userID, 'user-id-1');
    assert.equal(user.loginIDs.username, 'user1');
    assert.equal(user.loginIDs.email, 'user1@skygear.dev');
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
    pattern: 'http://skygear.dev/_auth/signup',
    fixtures: function (match, params, headers, fn) {
      const validUser = params['login_ids'] &&
        (params['login_ids']['username'] === 'username' ||
        params['login_ids']['email'] === 'user@email.com');
      if (validUser && params['password'] === 'passwd') {
        return fn({
          result: {
            user_id: 'user:id1',
            access_token: 'uuid1',
            login_ids: {
              username: 'user1',
              email: 'user1@skygear.io'
            },
            metadata: {
              // simulate serialisation and deserialisation by superagent
              ...JSON.parse(JSON.stringify(params['metadata'])) || {}
            }
          }
        });
      }
      if (params['login_ids'] &&
        params['login_ids']['username'] === 'duplicated') {
        return fn({
          error: {
            type: 'ResourceDuplicated',
            code: 101,
            message: 'user duplicated'
          }
        }, 400);
      }
      if (params['login_ids'] === null &&
        params['password'] === null) {

        return fn({
          result: {
            user_id: 'user:id2',
            access_token: 'uuid2',
            login_ids: {
              username: 'user2',
              email: 'user2@skygear.io'
            },
            metadata: {}
          }
        });
      }
    }
  }, {
    pattern: 'http://skygear.dev/_auth/login',
    fixtures: function (match, params, headers, fn) {
      const validUser = params['login_id']['username'] === 'registered' ||
        params['login_id']['email'] === 'user@email.com';
      if (validUser && params['password'] === 'passwd') {
        return fn({
          result: {
            user_id: 'user:id1',
            access_token: 'uuid1',
            login_ids: {
              username: 'user1',
              email: 'user1@skygear.io'
            },
            metadata: {}
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
    pattern: 'http://skygear.dev/_auth/change_password',
    fixtures: function (match, params, headers, fn) {
      if (params['old_password'] === params['password']) {
        return fn({
          result: {
            user_id: 'user:id1',
            access_token: 'uuid1',
            metadata: {}
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
    pattern: 'http://skygear.dev/_auth/logout',
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
      container.auth._user = new container.User();
      await container.store.removeItem('skygear-user');
      await container.auth._getUser();
      assert.isNull(container.auth.currentUser);
    }
  );


  it('_setUser should set _user=null with null attrs', async function () {
    container.auth._user = new container.User();
    await container.auth._setUser(null);
    assert.isNull(container.auth.currentUser);
  });

  it('_setUser should set _user=null with undefined attrs', async function () {
    container.auth._user = new container.User();
    await container.auth._setUser(undefined);
    assert.isNull(container.auth.currentUser);
  });

  it('should serialize and deserlize user correctly', async function () {
    const userAttrs = {
      user_id: 'user1',
      login_ids: {
        username: 'user1'
      },
      metadata: {
        age: 100
      }
    };
    await container.auth._setUser(userAttrs);
    assert.instanceOf(container.auth.currentUser, container.User);
    assert.equal(container.auth.currentUser.userID, 'user1');
    assert.equal(container.auth.currentUser.loginIDs.username, 'user1');
    assert.equal(container.auth.currentUser.metadata.age, 100);

    await container.auth._getUser();
    assert.instanceOf(container.auth.currentUser, container.User);
    assert.equal(container.auth.currentUser.userID, 'user1');
    assert.equal(container.auth.currentUser.loginIDs.username, 'user1');
    assert.equal(container.auth.currentUser.metadata.age, 100);
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
    assert.instanceOf(container.auth.currentUser, container.User);
    assert.equal(container.auth.currentUser.userID, 'user:id1');
    assert.equal(container.auth.currentUser.metadata.age, 100);
  });

  it('should signup with date in profile successfully', async function () {
    const user = await container.auth
      .signup({
        username: 'username',
        email: 'user@email.com'
      }, 'passwd', {
        birthday: new Date(0).toJSON()
      });
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.User);

    assert.equal(container.auth.currentUser.userID, 'user:id1');
    assert.equal(
      container.auth.currentUser.metadata.birthday,
      '1970-01-01T00:00:00.000Z'
    );
  });

  it('should signup with username successfully', async function () {
    const user = await container.auth.signupWithUsername('username', 'passwd');
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.User);
    assert.equal(container.auth.currentUser.userID, 'user:id1');
  });

  it('should signup with email successfully', async function () {
    const user = await container.auth
      .signupWithEmail('user@email.com', 'passwd');
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.User);
    assert.equal(container.auth.currentUser.userID, 'user:id1');
  });

  it('should signup anonymously', async function () {
    const user = await container.auth.signupAnonymously();
    assert.equal(
      container.auth.accessToken,
      'uuid2');
    assert.instanceOf(container.auth.currentUser, container.User);
    assert.equal(container.auth.currentUser.userID, 'user:id2');
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
    assert.instanceOf(container.auth.currentUser, container.User);
    assert.equal(container.auth.currentUser.userID, 'user:id1');
  });

  it('should login with email and correct password', async function () {
    const user = await container.auth
      .loginWithEmail('user@email.com', 'passwd');
    assert.equal(
      container.auth.accessToken,
      'uuid1');
    assert.instanceOf(container.auth.currentUser, container.User);
    assert.equal(container.auth.currentUser.userID, 'user:id1');
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
    assert.instanceOf(container.auth.currentUser, container.User);
    assert.equal(container.auth.currentUser.userID, 'user:id1');
    assert.instanceOf(user, container.User);
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

describe('Container updateMetadata', function () {
  let container = new Container();
  container.configApiKey('correctApiKey');
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/_auth/update_metadata',
    fixtures: function (match, params, headers, fn) {
      try {
        return fn({
          result: {
            user_id: 'user-id-1', // eslint-disable-line camelcase
            metadata: params.metadata
          }
        });
      } catch (err) {
        return fn({
          error: {
            code: 1000,
            message: 'json: cannot unmarshal'
          }
        }, 500);
      }
    }
  }]);

  it('should updateMetadata correctly', async function () {
    const metadata = {
      age: 18
    };
    const user = new container.User({
      user_id: 'user-id-1' // eslint-disable-line camelcase
    });
    container.auth._setUser(user);
    const newUser = await container.auth.updateMetadata(metadata);
    assert.instanceOf(newUser, container.User);
    assert.equal(newUser.userID, 'user-id-1');
    assert.equal(newUser.metadata.age, 18);
  });

  it('metadata should be an object', async function () {
    const user = new container.User({
      user_id: 'user-id-1',
      metadata: 18
    });
    try {
      await container.auth.updateMetadata(user);
      assert.fail('should fail');
    } catch (err) {
      assert.isNotNull(err);
    }
  });
});

/*eslint-enable camelcase, dot-notation, no-unused-vars, quote-props */
