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
import Container, {UserRecord} from '../lib/container';
import {AccessLevel} from '../lib/acl';
import Role from '../lib/role';

import mockSuperagent from './mock/superagent';

describe('Container', function () {
  it('should have default end-point', function () {
    let container = new Container();
    container.pubsub.autoPubsub = false;
    assert.equal(
      container.endPoint,
      'http://skygear.dev/',
      'we expected default endpoint');
  });

  it('should set end-point', function () {
    let container = new Container();
    container.pubsub.autoPubsub = false;
    container.endPoint = 'https://skygear.example.com/';
    assert.equal(
      container.endPoint,
      'https://skygear.example.com/',
      'we expected endpoint to be set');
  });

  it('should auto append slash to end-point', function () {
    let container = new Container();
    container.pubsub.autoPubsub = false;
    container.endPoint = 'https://skygear.example.com';
    assert.equal(
      container.endPoint,
      'https://skygear.example.com/',
      'we expected endpoint to ends with slash');
  });

  it('caches response by default', function () {
    let container = new Container();
    container.pubsub.autoPubsub = false;
    expect(container._db.cacheResponse).to.be.true();
  });

  it('does not eagerly initialize db when setting cacheResponse', function () {
    let container = new Container();
    container.pubsub.autoPubsub = false;

    container._db.cacheResponse = false;
    expect(container._db._public).to.be.null();
    expect(container._db._private).to.be.null();
  });

  it('initializes db with current cacheResponse setting', function () {
    let container = new Container();
    container.pubsub.autoPubsub = false;

    container._db.cacheResponse = false;
    expect(container._db._public).to.be.null();
    expect(container._db._private).to.be.null();

    expect(container.publicDB.cacheResponse).to.be.false();

    container.auth._accessToken = 'access-token';
    expect(container.privateDB.cacheResponse).to.be.false();
  });

  it('forwards cacheResponse to its databases', function () {
    let container = new Container();
    container.pubsub.autoPubsub = false;
    container._db.cacheResponse = false;
    container.auth._accessToken = 'dummy-access-token-to-enable-private-db';

    container._db.cacheResponse = true;
    expect(container.publicDB.cacheResponse).to.be.true();
    expect(container.privateDB.cacheResponse).to.be.true();

    container._db.cacheResponse = false;
    expect(container.publicDB.cacheResponse).to.be.false();
    expect(container.privateDB.cacheResponse).to.be.false();

    container._db.cacheResponse = true;
    expect(container.publicDB.cacheResponse).to.be.true();
    expect(container.privateDB.cacheResponse).to.be.true();
  });

  it('should clear access token on 104 AccessTokenNotAccepted', function () {
    let container = new Container();
    container.pubsub.autoPubsub = false;
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

    return container.makeRequest('any:action', {}).then(function () {
      throw 'Expected to be reject by wrong access token';
    }, function (err) {
      assert.isNull(container.auth.accessToken, 'accessToken not reset');
      assert.isNull(container.auth.currentUser, 'currentUser not reset');
    });
  });

  it('should call userChange listener', function () {
    let container = new Container();
    container.pubsub.autoPubsub = false;
    container.auth.onUserChanged(function (user) {
      assert.instanceOf(user, container.Record);
      assert.equal(user.id, 'user/user:id1');
    });
    return container.auth._setUser({_id: 'user/user:id1'});
  });

  it('should able to cancel a registered userChange listener', function () {
    let container = new Container();
    container.pubsub.autoPubsub = false;
    let handler = container.auth.onUserChanged(function (user) {
      throw 'Cancel of onUserChanged failed';
    });
    handler.cancel();
    return container.auth._setUser({_id: 'user/user:id1'});
  });
});

describe('Container role', function () {
  let container = new Container();
  container.configApiKey('correctApiKey');
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/role/admin',
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
    pattern: 'http://skygear.dev/role/default',
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
    pattern: 'http://skygear.dev/role/get',
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

  it('set admin roles', function () {
    var Killer = container.Role.define('Killer');
    var Police = container.Role.define('Police');

    return container.auth.setAdminRole([Killer, Police])
    .then(function (roles) {
      assert.include(roles, 'Killer');
      assert.include(roles, 'Police');
    }, function (err) {
      throw new Error('set admin roles failed');
    });
  });

  it('set default role', function () {
    var Healer = container.Role.define('Healer');
    var Victim = container.Role.define('Victim');

    return container.auth.setDefaultRole([Victim, Healer])
    .then(function (roles) {
      assert.include(roles, 'Healer');
      assert.include(roles, 'Victim');
    }, function (err) {
      throw new Error('set default role failed');
    });
  });

  it('should fetch user roles', function () {
    let users = [
      new UserRecord({_id: 'user/user1'}),
      new UserRecord({_id: 'user/user2'}),
      'user3'
    ];
    return container.auth.fetchUserRole(users)
    .then(function (result) {
      expect(Object.keys(result)).to.have.length(3);
      expect(result['user1']).to.have.length(1);
      expect(result['user1'][0]).to.be.instanceof(Role);
      expect(result['user1'][0].name).to.eql('Developer');
      expect(result['user2']).to.have.length(2);
      expect(result['user2'][0].name).to.eql('Admin');
      expect(result['user2'][1].name).to.eql('Tester');
      expect(result['user3']).to.have.length(0);
    }, function (error) {
      throw Error();
    });
  });
});

describe('Container acl', function () {
  let container = new Container();
  container.configApiKey('correctApiKey');
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/schema/access',
    fixtures: function (match, params, headers, fn) {
      let type = params['type'];
      let createRoles = params['create_roles'];

      if (type === 'script' &&
        createRoles.indexOf('Writer') !== -1 &&
        createRoles.indexOf('Web Master') !== -1) {

        return fn({
          result: {
            type: type,
            create_roles: createRoles   // eslint-disable-line camelcase
          }
        });
      }
    }
  }, {
    pattern: 'http://skygear.dev/schema/default_access',
    fixtures: function (match, params, headers, fn) {
      let type = params['type'];
      let defaultAccess = params['default_access'];
      let acl = container.ACL.fromJSON(defaultAccess);
      let Admin = container.Role.define('Admin');
      if (type === 'note' &&
        acl.hasPublicReadAccess() &&
        acl.hasWriteAccessForRole(Admin)) {

        return fn({
          result: {
            type: type,
            default_access: defaultAccess   // eslint-disable-line camelcase
          }
        });
      }
    }
  }]);

  it('set record create access', function () {
    let Writer = container.Role.define('Writer');
    let WebMaster = container.Role.define('Web Master');
    let Script = container.Record.extend('script');

    return container.publicDB.setRecordCreateAccess(Script, [Writer, WebMaster])
    .then(function (result) {
      let {type, create_roles: roles} = result; // eslint-disable-line camelcase

      assert.strictEqual(type, Script.recordType);
      assert.include(roles, Writer.name);
      assert.include(roles, WebMaster.name);
    }, function (err) {
      throw new Error('set record create access failed');
    });
  });

  it('set default ACL', function () {
    let Note = container.Record.extend('note');
    let Admin = container.Role.define('Admin');
    let acl = new container.ACL();
    acl.setPublicReadOnly();
    acl.setReadWriteAccessForRole(Admin);

    return container.publicDB.setRecordDefaultAccess(Note, acl)
      .then((result) => {
        let {type, default_access: defaultAccess} = result;
        let responseACL = container.ACL.fromJSON(defaultAccess);

        assert.strictEqual(type, Note.recordType);
        assert.ok(responseACL.hasPublicReadAccess());
        assert.ok(responseACL.hasWriteAccessForRole(Admin));
      }, function (err) {
        throw new Error('set record default access failed', err);
      });
  });
});

describe('lambda', function () {
  let container = new Container();
  container.pubsub.autoPubsub = false;
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

  it('should expose Query as constructor', function () {
    assert.isFunction(container.Query);
    assert.instanceOf(
      new container.Query(container.Record.extend('note')),
      container.Query
    );
  });

  it('should expose static methods of Query', function () {
    assert.isFunction(container.Query.or);
  });
});
/*eslint-enable dot-notation, no-unused-vars, quote-props */
