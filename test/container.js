import {assert} from 'chai';
import Container from '../lib/container';

import mockSuperagent from './mock/superagent';
let request = mockSuperagent([{
  pattern: 'http://ourd.dev/auth/signup',
  fixtures: function (match, params, headers, fn) {
    if (params['user_id'] === 'user@email.com' && params['password'] === 'passwd') {
      return fn({
        'result': {
          'user_id': 'user:id1',
          'access_token': 'uuid1'
        }
      });
    }
    if (params['user_id'] === 'duplicated') {
      return fn({
        'error': {
          'type':'ResourceDuplicated',
          'code':101,
          'message':'user duplicated'
        }
      }, 400);
    }
  }
}, {
  pattern: 'http://ourd.dev/auth/login',
  fixtures: function (match, params, headers, fn) {
    if (params['user_id'] === 'registered' && params['password'] === 'passwd') {
      return fn({
        'result': {
          'user_id': 'user:id1',
          'access_token': 'uuid1'
        }
      });
    }
    return fn({
      'error': {
        'type': 'AuthenticationError',
        'code': 102,
        'message':'invalid authentication information'
      }
    }, 400);
  }
}]);

describe('Container', function () {
  it('should have default end-point', function () {
    let container = new Container();
    assert.equal(
      container.endPoint,
      'http://ourd.dev/',
      'we expected default endpoint');
  });
});

describe('Container auth', function () {
  let container = new Container();
  container.request = request;
  container.configApiKey('correctApiKey');

  it('should signup successfully', function () {
    return container
      .signup('user@email.com', 'user@email.com', 'passwd')
      .then(function (token) {
        assert.equal(
          token,
          'uuid1');
      }, function () {
        throw new Error('Signup failed');
      });
  });

  it('should not signup duplicate account', function () {
    return container.signup('duplicated', 'passwd').then(function (token) {
      throw new Error('Signup duplicated user');
    }, function (error) {
      assert.equal(
        error.message,
        'user duplicated');
    });
  });

  it('should login with correct password', function () {
    return container.login('registered', 'passwd').then(function (token) {
      assert.equal(
        token,
        'uuid1');
    }, function (error) {
      throw new Error('Failed to login with correct password');
    });
  });

  it('should fail to login with incorrect password', function () {
    return container.login('registered', 'wrong').then(function (token) {
      throw new Error('Login with wrong password');
    }, function (error) {
      assert.equal(
        error.message,
        'invalid authentication information');
    });
  });
});
