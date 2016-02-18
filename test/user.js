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
/*eslint-disable no-new, camelcase, no-unused-expressions */
import {expect} from 'chai';
import _ from 'lodash';
import User from '../lib/user';
import Role from '../lib/role';

describe('User', function () {

  it('create with userid, email and username', function () {
    const user = new User({
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com',
      roles: []
    });
    expect(user).to.be.an.instanceof(User);
  });

  it('fails to create without user_id', function () {
    expect(function () {
      new User({
        username: 'rick'
      }); //eslint-disable-line no-unused-vars
    }).to.throw(
      'Missing user_id.'
    );
  });

  it('serialize for persist', function () {
    const payload = {
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com',
      roles: []
    };
    const user = new User(payload);
    expect(user.toJSON()).eql(payload);
  });

  it('deserialize from json', function () {
    const payload = {
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com',
      roles: []
    };
    const user = User.fromJSON(payload);
    expect(user).to.be.an.instanceof(User);
  });

  it('add role', function () {
    const user = User.fromJSON({
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com',
      roles: []
    });

    user.addRole(Role.define('Developer'));
    user.addRole(Role.define('Designer'));

    const roleNames = _.map(user.roles, 'name');

    expect(roleNames).to.contain('Developer');
    expect(roleNames).to.contain('Designer');
  });

  it('duplicated add role', function () {
    const user = User.fromJSON({
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com',
      roles: []
    });

    user.addRole(Role.define('Developer'));
    user.addRole(Role.define('Developer'));

    expect(user.roles).to.have.length(1);
  });

  it('remove role', function () {
    const user = User.fromJSON({
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com',
      roles: []
    });

    let Developer = Role.define('Developer');

    user.addRole(Developer);
    user.removeRole(Developer);

    const roleNames = _.map(user.roles, 'name');

    expect(roleNames).to.not.contain('Developer');
  });

  it('duplicated remove role', function () {
    const user = User.fromJSON({
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com',
      roles: []
    });

    let Developer = Role.define('Developer');

    user.addRole(Developer);
    user.removeRole(Developer);
    user.removeRole(Developer);

    const roleNames = _.map(user.roles, 'name');

    expect(roleNames).to.not.contain('Developer');
  });

  it('has role', function () {
    let Developer = Role.define('Developer');
    let TechLeader = Role.define('Tech Leader');

    const user = User.fromJSON({
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com',
      roles: []
    });

    user.addRole(TechLeader);

    expect(user.hasRole(TechLeader)).to.be.true;
    expect(user.hasRole(Developer)).to.be.false;
  });

});
/*eslint-enable no-new, camelcase, no-unused-expressions */
