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
import {AccessLevel} from '../lib/acl';

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

  it('caches response by default', function () {
    let container = new Container();
    container.autoPubsub = false;
    expect(container.cacheResponse).to.be.true();
  });

  it('does not eagerly initialize db when setting cacheResponse', function () {
    let container = new Container();
    container.autoPubsub = false;

    container.cacheResponse = false;
    expect(container._publicDB).to.be.null();
    expect(container._privateDB).to.be.null();
  });

  it('initializes db with current cacheResponse setting', function () {
    let container = new Container();
    container.autoPubsub = false;

    container.cacheResponse = false;
    expect(container._publicDB).to.be.null();
    expect(container._privateDB).to.be.null();

    expect(container.publicDB.cacheResponse).to.be.false();

    container._accessToken = 'access-token';
    expect(container.privateDB.cacheResponse).to.be.false();
  });

  it('forwards cacheResponse to its databases', function () {
    let container = new Container();
    container.autoPubsub = false;
    container.cacheResponse = false;
    container._accessToken = 'dummy-access-token-to-enable-private-db';

    container.cacheResponse = true;
    expect(container.publicDB.cacheResponse).to.be.true();
    expect(container.privateDB.cacheResponse).to.be.true();

    container.cacheResponse = false;
    expect(container.publicDB.cacheResponse).to.be.false();
    expect(container.privateDB.cacheResponse).to.be.false();

    container.cacheResponse = true;
    expect(container.publicDB.cacheResponse).to.be.true();
    expect(container.privateDB.cacheResponse).to.be.true();
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

describe('Container me', function () {
  let container = new Container();
  container.autoPubsub = false;
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
    container._accessToken = 'token-1';
    return container.whoami()
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
    container._accessToken = null;
    return container.whoami()
    .then(function (user) {
      throw new Error('Should not get me without access token');
    }, function (err) {
      assert.isNotNull(err);
    });
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

  it('should signup anonymously', function () {
    return container
      .signupAnonymously()
      .then(function (user) {
        assert.equal(
          container.accessToken,
          'uuid2');
        assert.instanceOf(container.currentUser, container.User);
        assert.equal(
          container.currentUser.id,
          'user:id2'
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

  it('should login with provider successfully', function () {
    return container
      .loginWithProvider('provider', {})
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
        throw new Error('Failed to login with provider');
      });
  });

  it('should be able to set null accessToken', function () {
    return container._setAccessToken(null)
    .then(function () {
      assert.equal(container.accessToken, null);
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
      container._setAccessToken(aUserAttr.access_token),
      container._setUser(aUserAttr)
    ])
    .then(() => {
      assert.equal(container.accessToken, aUserAttr.access_token);
      assert.isNotNull(container.currentUser, aUserAttr.currentUser);

      return container.logout();
    })
    .then(() => {
      assert.isNull(container.accessToken, aUserAttr.access_token);
      assert.isNull(container.currentUser, aUserAttr.currentUser);
    });
    /* eslint-enable-line camelcase */
  });

  it('should change password successfully', function () {
    return container
      .changePassword('supersecret', 'supersecret')
      .then(function (user) {
        assert.equal(container.accessToken, 'uuid1');
        assert.instanceOf(container.currentUser, container.User);
        assert.equal(container.currentUser.id, 'user:id1');
        assert.instanceOf(user, container.User);
      }, function (error) {
        throw new Error('Failed to change password');
      });
  });

  it('should fail to change password if not match', function () {
    return container
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
    return container
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
    return container
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
    return container._setUser(null).then(function () {
      assert.isNull(container.currentUser);
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

    return container.saveUser(user)
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

    return container.saveUser(payload)
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

    container._user = container.User.fromJSON(payload);

    let user = container.User.fromJSON(payload);
    user.email = 'current_user_new_email@skygear.io';

    return container.saveUser(user)
    .then(function () {
      assert.equal(container.currentUser.email, user.email);
    }, function (err) {
      console.error(err);
      throw new Error('update current user error', JSON.stringify(err));
    });
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
  }]);

  it('set admin roles', function () {
    var Killer = container.Role.define('Killer');
    var Police = container.Role.define('Police');

    return container.setAdminRole([Killer, Police])
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

    return container.setDefaultRole([Victim, Healer])
    .then(function (roles) {
      assert.include(roles, 'Healer');
      assert.include(roles, 'Victim');
    }, function (err) {
      throw new Error('set default role failed');
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
  }]);

  it('set record create access', function () {
    let Writer = container.Role.define('Writer');
    let WebMaster = container.Role.define('Web Master');
    let Script = container.Record.extend('script');

    return container.setRecordCreateAccess(Script, [Writer, WebMaster])
    .then(function (result) {
      let {type, create_roles: roles} = result; // eslint-disable-line camelcase

      assert.strictEqual(type, Script.recordType);
      assert.include(roles, Writer.name);
      assert.include(roles, WebMaster.name);
    }, function (err) {
      throw new Error('set record create access failed');
    });
  });

  it('get / set default ACL', function () {
    let Admin = container.Role.define('Admin');
    let ACL = container.ACL;
    let Note = container.Record.extend('note');

    // Before changes
    let acl = container.defaultACL;
    assert.isTrue(acl.public);
    assert.lengthOf(Object.keys(acl.roles), 0);

    let aNote = new Note({
      content: 'Hello World'
    });

    let recordACL = aNote.access;
    assert.isTrue(recordACL.public);
    assert.lengthOf(Object.keys(recordACL.roles), 0);

    // changes
    acl.setPublicNoAccess();
    acl.setReadWriteAccessForRole(Admin);
    container.setDefaultACL(acl);

    // After changes
    acl = container.defaultACL;

    assert.isNotTrue(acl.public);
    assert.lengthOf(Object.keys(acl.roles), 1);
    assert.equal(acl.roles[Admin.name], AccessLevel.ReadWriteLevel);

    aNote = new Note({
      content: 'Hello World Again'
    });

    recordACL = aNote.access;
    assert.isNotTrue(recordACL.public);
    assert.lengthOf(Object.keys(recordACL.roles), 1);
    assert.equal(recordACL.roles[Admin.name], AccessLevel.ReadWriteLevel);

    // set back to default
    container.setDefaultACL(new ACL());
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
        }, 400);
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
    return container
      .registerDevice('device-token', 'android')
      .then(function (deviceID) {
        assert.equal(deviceID, 'device-id');
        assert.equal(container.deviceID, 'device-id');
      }, function () {
        throw 'failed to save device id';
      });
  });

  it('should attach existing device id', function () {
    return container._setDeviceID('existing-device-id').then(function () {
      return container.registerDevice('ddevice-token', 'ios');
    }).then(function (deviceID) {
      assert.equal(deviceID, 'existing-device-id');
      assert.equal(container.deviceID, 'existing-device-id');
    });
  });

  it('should retry with null deviceID on first call fails', function () {
    return container._setDeviceID('non-exist').then(function () {
      return container.registerDevice('ddevice-token', 'ios');
    }).then(function (deviceID) {
      assert.equal(deviceID, 'device-id');
      assert.equal(container.deviceID, 'device-id');
    });
  });

  it('should be able to set null deviceID', function () {
    return container._setDeviceID(null).then(function () {
      assert.equal(container.deviceID, null);
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
