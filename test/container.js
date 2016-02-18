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
import {assert} from 'chai';
import Container from '../lib/container';

import mockSuperagent from './mock/superagent';

describe('Container', function () {
  it('should have default end-point', function () {
    let container = new Container();
    container.autoPubsub = false;
    assert.equal(
      container.endPoint,
      'http://skygear.dev/',
      'we expected default endpoint');
  });

  it('should clear access token on 104 AccessTokenNotAccepted', function () {
    let container = new Container();
    container.autoPubsub = false;
    container.configApiKey('correctApiKey');
    container._accessToken = 'incorrectApiKey';
    container.request = mockSuperagent([{
      pattern: 'http://skygear.dev/any/action',
      fixtures: function (match, params, headers, fn) {
        return fn({
          error: {
            name: 'AccessTokenNotAccepted',
            code: 104,
            message: 'token expired'
          }
        }, 401);
      }
    }]);

    return container.makeRequest('any:action', {}).then(function () {
      throw 'Expected to be reject by wrong access token';
    }, function (err) {
      assert.isNull(container.accessToken, 'accessToken not reset');
      assert.isNull(container.currentUser, 'currentUser not reset');
    });
  });

  it('should call userChange listener', function () {
    let container = new Container();
    container.autoPubsub = false;
    container.onUserChanged(function (user) {
      assert.instanceOf(user, container.User);
      assert.equal(user.id, 'user:id1');
    });
    return container._setUser({_id: 'user:id1'});
  });

  it('should able to cancel a registered userChange listener', function () {
    let container = new Container();
    container.autoPubsub = false;
    let handler = container.onUserChanged(function (user) {
      throw 'Cancel of onUserChanged failed';
    });
    handler.cancel();
    return container._setUser({_id: 'user:id1'});
  });
});

describe('Container auth', function () {
  let container = new Container();
  container.autoPubsub = false;
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
    }
  }, {
    pattern: 'http://skygear.dev/auth/login',
    fixtures: function (match, params, headers, fn) {
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
  }]);
  container.configApiKey('correctApiKey');

  it('should signup successfully', function () {
    return container
      .signupWithUsername('username', 'passwd')
      .then(function (user) {
        assert.equal(
          container.accessToken,
          'uuid1');
        assert.instanceOf(container.currentUser, container.User);
        assert.equal(
          container.currentUser.id,
          'user:id1'
        );
      }, function () {
        throw new Error('Signup failed');
      });
  });

  it('should signup with email successfully', function () {
    return container
      .signupWithEmail('user@email.com', 'passwd')
      .then(function (user) {
        assert.equal(
          container.accessToken,
          'uuid1');
        assert.instanceOf(container.currentUser, container.User);
        assert.equal(
          container.currentUser.id,
          'user:id1'
        );
      }, function () {
        throw new Error('Signup failed');
      });
  });

  it('should not signup duplicate account', function () {
    return container
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
    return container
      .loginWithUsername('registered', 'passwd')
      .then(function (user) {
        assert.equal(
          container.accessToken,
          'uuid1');
        assert.instanceOf(container.currentUser, container.User);
        assert.equal(
          container.currentUser.id,
          'user:id1'
        );
      }, function (error) {
        throw new Error('Failed to login with correct password');
      });
  });

  it('should login with email and correct password', function () {
    return container
      .loginWithEmail('user@email.com', 'passwd')
      .then(function (user) {
        assert.equal(
          container.accessToken,
          'uuid1');
        assert.instanceOf(container.currentUser, container.User);
        assert.equal(
          container.currentUser.id,
          'user:id1'
        );
      }, function (error) {
        throw new Error('Failed to login with correct password');
      });
  });

  it('should fail to login with incorrect password', function () {
    return container
      .loginWithUsername('registered', 'wrong')
      .then(function (user) {
        throw new Error('Login with wrong password');
      }, function (err) {
        assert.equal(
          err.error.message,
          'invalid authentication information');
      });
  });

  it('should be able to set null accessToken', function () {
    container._setAccessToken(null).then(function () {
      assert(container.accessToken).to.equal(null);
    });
  });
});

describe('Container getUsers', function () {
  let container = new Container();
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/user/query',
    fixtures: function (match, params, headers, fn) {
      if (params['emails'][0] === 'user1@skygear.io') {
        return fn({
          'result': [{
            data: {
              _id: 'user:id1',
              email: 'user1@skygear.io',
              username: 'user1'
            },
            id: 'user:id1',
            type: 'user'
          }]
        });
      }
    }
  }]);
  container.configApiKey('correctApiKey');

  it('query user with email successfully', function () {
    return container
      .getUsersByEmail(['user1@skygear.io'])
      .then(function (users) {
        assert.instanceOf(users[0], container.User);
        assert.equal(
          users[0].id,
          'user:id1'
        );
        assert.equal(
          users[0].username,
          'user1'
        );
      }, function () {
        throw new Error('getUsersByEmail failed');
      });
  });

  it('should be able to set null user', function () {
    container._setUser(null).then(function () {
      assert(container.currentUser).to.equal(null);
    });
  });
});

describe('Container device registration', function () {
  let container = new Container();
  container.autoPubsub = false;
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/device/register',
    fixtures: function (match, params, headers, fn) {
      if (params.id && params.id === 'non-exist') {
        return fn({
          'error': {
            'name': 'ResourceNotFound',
            'code': 110,
            'message': 'device not found'
          }
        });
      } else if (params.id) {
        return fn({
          'result': {
            'id': params.id
          }
        });
      } else {
        return fn({
          'result': {
            'id': 'device-id'
          }
        });
      }
    }
  }]);
  container.configApiKey('correctApiKey');

  it('should save device id successfully', function () {
    container
      .registerDevice('device-token', 'android')
      .then(function (deviceID) {
        assert(deviceID).to.equal('device-id');
        assert(container.deviceID).to.equal('device-id');
      }, function () {
        throw 'failed to save device id';
      });
  });

  it('should attach existing device id', function () {
    container._setDeviceID('existing-device-id').then(function () {
      return container.registerDevice('ddevice-token', 'ios');
    }).then(function (deviceID) {
      assert(deviceID).to.equal('existing-device-id');
      assert(container.deviceID).to.equal('existing-device-id');
    });
  });

  it('should retry with null deviceID on first call fails', function () {
    container._setDeviceID('non-exist').then(function () {
      return container.registerDevice('ddevice-token', 'ios');
    }).then(function (deviceID) {
      assert(deviceID).to.equal('device-id');
      assert(container.deviceID).to.equal('device-id');
    });
  });

  it('should be able to set null deviceID', function () {
    container._setDeviceID(null).then(function () {
      assert(container.deviceID).to.equal(null);
    });
  });
});

describe('lambda', function () {
  let container = new Container();
  container.autoPubsub = false;
  container.request = container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/hello/world',
    fixtures: function (match, params, headers, fn) {
      return fn({
        'result': {
          'hello': 'world'
        }
      });
    }
  }, {
    pattern: 'http://skygear.dev/hello/args',
    fixtures: function (match, params, headers, fn) {
      return fn({
        'result': {
          'hello': params['args']
        }
      });
    }
  }, {
    pattern: 'http://skygear.dev/hello/failure',
    fixtures: function (match, params, headers, fn) {
      return fn({
        'error': {
          'type': 'UnknownError',
          'code': 1,
          'message': 'lambda error'
        }
      }, 400);
    }
  }]);
  container.configApiKey('correctApiKey');

  it('should call lambda correctly', function () {
    return container.lambda('hello:world').then(function (result) {
      assert.deepEqual(result, {'hello': 'world'});
    });
  });

  it('should pass dict parameters', function () {
    return container
      .lambda('hello:args', {'name': 'world'})
      .then(function (result) {
        assert.deepEqual(result, {
          'hello': {
            'name': 'world'
          }
        });
      });
  });

  it('should pass array parameters', function () {
    return container
      .lambda('hello:args', ['hello', 'world'])
      .then(function (result) {
        assert.deepEqual(result, {
          'hello': ['hello', 'world']
        });
      });
  });

  it('should parse error', function () {
    return container.lambda('hello:failure').then(function (result) {
      throw new Error('Failed to parse erroneous lambda result');
    }, function (err) {
      assert.equal(err.error.message, 'lambda error');
    });
  });
});
/*eslint-enable dot-notation, no-unused-vars, quote-props */
