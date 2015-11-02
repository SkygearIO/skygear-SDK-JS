import {assert} from 'chai';
import Container from '../lib/container';

import mockSuperagent from './mock/superagent';

describe('Container', function () {
  it('should have default end-point', function () {
    let container = new Container();
    assert.equal(
      container.endPoint,
      'http://skygear.dev/',
      'we expected default endpoint');
  });
});

describe('Container auth', function () {
  let container = new Container();
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/auth/signup',
    fixtures: function (match, params, headers, fn) {
      const validUser = params['username'] === 'username' ||
        params['email'] === 'user@email.com';
      if (validUser && params['password'] === 'passwd') {
        return fn({
          'result': {
            'user_id': 'user:id1',
            'access_token': 'uuid1'
          }
        });
      }
      if (params['username'] === 'duplicated') {
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
    pattern: 'http://skygear.dev/auth/login',
    fixtures: function (match, params, headers, fn) {
      const validUser = params['username'] === 'registered' ||
        params['email'] === 'user@email.com';
      if (validUser && params['password'] === 'passwd') {
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
  container.configApiKey('correctApiKey');

  it('should signup successfully', function () {
    return container
      .signup('username', 'passwd')
      .then(function (token) {
        assert.equal(
          token,
          'uuid1');
      }, function () {
        throw new Error('Signup failed');
      });
  });

  it('should signup with email successfully', function () {
    return container
      .signupWithEmail('user@email.com', 'passwd')
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
    }, function (err) {
      assert.equal(
        err.error.message,
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

  it('should login with email and correct password', function () {
    return container
      .loginWithEmail('user@email.com', 'passwd')
      .then(function (token) {
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
    }, function (err) {
      assert.equal(
        err.error.message,
        'invalid authentication information');
    });
  });
});

describe('lambda', function () {
  let container = new Container();
  container.request =   container.request = mockSuperagent([{
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
  }]);;
  container.configApiKey('correctApiKey');

  it('should call lambda correctly', function () {
    return container.lambda('hello:world').then(function (result) {
      assert.deepEqual(result, {'hello': 'world'});
    });
  });

  it('should pass dict parameters', function () {
    return container.lambda('hello:args', {'name': 'world'}).then(function (result) {
      assert.deepEqual(result, {
        'hello': {
          'name': 'world'
        }
      });
    });
  });

  it('should pass array parameters', function () {
    return container.lambda('hello:args', ['hello', 'world']).then(function (result) {
      assert.deepEqual(result, {
        'hello': ['hello', 'world']
      });
    });
  });

  it('should parse error', function () {
    return container.lambda('hello:failure').then(function (result) {
      throw new Error('Failed to parse erroneous lambda result');
    }, function(err) {
      assert.equal(err.error.message, 'lambda error');
    });
  });
});
