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

import {expect} from 'chai';
import Role from '../lib/role';

describe('Role', function () {
  it('normally role definition', function () {
    let Boss = Role.define('Boss');
    expect(Boss).to.be.an.instanceof(Role);
    expect(Boss.name).to.be.eql('Boss');
  });

  it('should not allow invalid role name', function () {
    expect(function () {
      return Role.define('_Thief');
    }).to.throw(Error);
  });

  it('should not create duplicated role object', function () {
    let Student = Role.define('Student');
    let AlsoStudent = Role.define('Student');
    expect(Student).to.equal(AlsoStudent);
  });

  it('serialization', function () {
    let Developer = Role.define('Developer');

    expect(Developer.toJSON()).to.eql({
      name: 'Developer'
    });
  });

  it('deserialization', function () {
    let Developer = Role.fromJSON({
      name: 'Developer'
    });

    expect(Developer).to.equal(Role.define('Developer'));
  });

  it('union roles', function () {
    let King = Role.define('King');
    let Queen = Role.define('Queen');
    let Knight = Role.define('Knight');

    let roles = Role.union([King, Queen], Knight);
    expect(roles).to.have.length(3);
    expect(roles).to.contain(King);
    expect(roles).to.contain(Queen);
    expect(roles).to.contain(Knight);

    expect(Role.union([King, Queen], Queen)).to.have.length(2);
  });

  it('subtract roles', function () {
    let King = Role.define('King');
    let Queen = Role.define('Queen');
    let Knight = Role.define('Knight');

    let roles = Role.subtract([King, Queen, Knight], Knight);
    expect(roles).to.have.length(2);
    expect(roles).to.contain(King);
    expect(roles).to.contain(Queen);
    expect(roles).to.not.contain(Knight);

    expect(Role.subtract([King, Queen], Knight)).to.have.length(2);
  });

  it('contain roles', function () {
    let King = Role.define('King');
    let Queen = Role.define('Queen');
    let Knight = Role.define('Knight');

    /* eslint-disable no-unused-expressions */
    expect(Role.contain([King, Queen], King)).to.be.true;
    expect(Role.contain([King, Queen], Knight)).to.be.false;
    /* eslint-enable no-unused-expressions */
  });
});
