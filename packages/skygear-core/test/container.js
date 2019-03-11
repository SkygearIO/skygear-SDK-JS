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
import _ from 'lodash';
import {assert, expect} from 'chai';
import Container from '../lib/container';
import UserRecord from '../lib/user_record';
import Role from '../lib/role';

import mockSuperagent from './mock/superagent';

describe('Container', function () {
  it('should have version number injected to the container', function () {
    let container = new Container();
    expect(container.VERSION).to.eql(Container.VERSION);
    expect(container.VERSION).to.exist();
    expect(container.VERSION).to.not.be.empty();
  });

  it('should have default end-point', function () {
    let container = new Container();
    assert.equal(
      container.endPoint,
      'http://skygear.dev/',
      'we expected default endpoint');
  });

  it('should set end-point', function () {
    let container = new Container();
    container.endPoint = 'https://skygear.example.com/';
    assert.equal(
      container.endPoint,
      'https://skygear.example.com/',
      'we expected endpoint to be set');
  });

  it('should auto append slash to end-point', function () {
    let container = new Container();
    container.endPoint = 'https://skygear.example.com';
    assert.equal(
      container.endPoint,
      'https://skygear.example.com/',
      'we expected endpoint to ends with slash');
  });

  it('should set the content type header', async function () {
    let container = new Container();
    container.configApiKey('correctApiKey');
    container.request = mockSuperagent([{
      pattern: 'http://skygear.dev/content/type',
      fixtures: function (match, params, headers, fn) {
        if (headers['Content-Type'] !== 'application/json') {
          return fn({
            status: 'fails'
          }, 500);
        }
        return fn({
          status: 'ok'
        });
      }
    }]);

    await container.makeRequest('content:type', {});
  });

  it(
    'should clear access token on 104 AccessTokenNotAccepted',
    async function () {
      let container = new Container();
      container.configApiKey('correctApiKey');
      container.auth._accessToken = 'incorrectApiKey';
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

      try {
        await container.makeRequest('any:action', {});
        assert.fail('should fail');
      } catch (err) {
        assert.isNull(container.auth.accessToken, 'accessToken not reset');
        assert.isNull(container.auth.currentUser, 'currentUser not reset');
      }
    }
  );

  it('should call userChange listener', function (done) {
    let container = new Container();
    container.auth.onUserChanged(function (user) {
      assert.instanceOf(user, container.UserRecord);
      assert.equal(user.recordType, 'user');
      assert.equal(user.recordID, 'user:id1');
      done();
    });
    return container.auth._setUser({
      _recordType: 'user',
      _recordID: 'user:id1'
    });
  });

  it('should able to cancel a registered userChange listener', function (done) {
    let container = new Container();
    let handler = container.auth.onUserChanged(function (user) {
      throw 'Cancel of onUserChanged failed';
    });
    handler.cancel();

    setTimeout(function () {
      done();
    }, 1500);

    return container.auth._setUser({
      _recordType: 'user',
      _recordID: 'user:id1'
    });
  });
});

describe('Container role', function () {
  let container = new Container();
  container.configApiKey('correctApiKey');
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/auth/role/admin',
    fixtures: function (match, params, headers, fn) {
      var roles = params['roles'];
      if (roles.indexOf('Killer') !== -1 && roles.indexOf('Police') !== -1) {
        return fn({
          'result': [
            'Killer',
            'Police'
          ]
        });
      }
    }
  }, {
    pattern: 'http://skygear.dev/auth/role/default',
    fixtures: function (match, params, headers, fn) {
      var roles = params['roles'];
      if (roles.indexOf('Healer') !== -1 && roles.indexOf('Victim') !== -1) {
        return fn({
          'result': [
            'Healer',
            'Victim'
          ]
        });
      }
    }
  }, {
    pattern: 'http://skygear.dev/auth/role/get',
    fixtures: function (match, params, headers, fn) {
      let userIds = params['users'];
      if (userIds.length === 3 && userIds[0] === 'user1' &&
        userIds[1] === 'user2' && userIds[2] === 'user3') {
        return fn({
          result: {
            user1: ['Developer'],
            user2: ['Admin', 'Tester'],
            user3: []
          }
        });
      }
    }
  }]);

  it('set admin roles', async function () {
    var Killer = container.Role.define('Killer');
    var Police = container.Role.define('Police');

    const roles = await container.auth.setAdminRole([Killer, Police]);
    assert.include(roles, 'Killer');
    assert.include(roles, 'Police');
  });

  it('set default role', async function () {
    var Healer = container.Role.define('Healer');
    var Victim = container.Role.define('Victim');

    const roles = await container.auth.setDefaultRole([Victim, Healer]);
    assert.include(roles, 'Healer');
    assert.include(roles, 'Victim');
  });

  it('should fetch user roles', async function () {
    let users = [
      new UserRecord({
        _recordType: 'user',
        _recordID: 'user1'
      }),
      new UserRecord({
        _recordType: 'user',
        _recordID: 'user2'
      }),
      'user3'
    ];
    const result = await container.auth.fetchUserRole(users);
    expect(Object.keys(result)).to.have.length(3);
    expect(result['user1']).to.have.length(1);
    expect(result['user1'][0]).to.be.instanceof(Role);
    expect(result['user1'][0].name).to.eql('Developer');
    expect(result['user2']).to.have.length(2);
    expect(result['user2'][0].name).to.eql('Admin');
    expect(result['user2'][1].name).to.eql('Tester');
    expect(result['user3']).to.have.length(0);
  });
});

describe('lambda', function () {
  let container = new Container();
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

  it('should call lambda correctly', async function () {
    const result = await container.lambda('hello:world');
    assert.deepEqual(result, {'hello': 'world'});
  });

  it('should pass dict parameters', async function () {
    const result = await container.lambda('hello:args', {'name': 'world'});
    assert.deepEqual(result, {
      'hello': {
        'name': 'world'
      }
    });
  });

  it('should pass array parameters', async function () {
    const result = await container.lambda('hello:args', ['hello', 'world']);
    assert.deepEqual(result, {
      'hello': ['hello', 'world']
    });
  });

  it('should parse error', async function () {
    try {
      await container.lambda('hello:failure');
      assert.fail('should fail');
    } catch (err) {
      assert.equal(err.message, 'lambda error');
    }
  });
});
/*eslint-enable dot-notation, no-unused-vars, quote-props */
