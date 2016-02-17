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

/* eslint-disable no-unused-expressions */
import {expect} from 'chai';
import Role from '../lib/role';
import ACL, {AccessLevel} from '../lib/acl';

describe('ACL', function () {
  let Driver = Role.define('Driver');
  let Passenger = Role.define('Passenger');

  it('create ACL', function () {
    let acl = new ACL();
    let entries = acl.entries;
    expect(entries).to.have.length(1);

    let firstEntry = entries[0];
    expect(firstEntry.level).to.equal(AccessLevel.ReadLevel);
    expect(firstEntry.role).to.equal(Role.Public);
  });

  it('serialization', function () {
    const payload = [
      {
        level: AccessLevel.ReadLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.WriteLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.ReadLevel,
        role: 'Driver'
      }
    ];

    const acl = ACL.fromJSON(payload);
    expect(acl.toJSON()).eql(payload);
  });

  it('deserialization', function () {
    const payload = [
      {
        level: AccessLevel.ReadLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.WriteLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.ReadLevel,
        role: 'Driver'
      }
    ];

    const acl = ACL.fromJSON(payload);
    expect(acl).to.be.an.instanceof(ACL);
  });

  it('have access', function () {
    const acl = ACL.fromJSON([
      {
        level: AccessLevel.ReadLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.WriteLevel,
        role: 'Passenger'
      }
    ]);

    expect(acl.hasReadAccess(Driver)).to.be.false;
    expect(acl.hasReadAccess(Passenger)).to.be.true;
    expect(acl.hasWriteAccess(Passenger)).to.be.true;
  });

  it('add read / write access', function () {
    const acl = ACL.fromJSON([
      {
        level: AccessLevel.ReadLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.WriteLevel,
        role: 'Passenger'
      }
    ]);

    expect(acl.hasReadAccess(Driver)).to.be.false;
    expect(acl.hasWriteAccess(Driver)).to.be.false;

    acl.addReadAccess(Driver);
    expect(acl.hasReadAccess(Driver)).to.be.true;

    acl.addWriteAccess(Driver);
    expect(acl.hasWriteAccess(Driver)).to.be.true;
  });

  it('remove read / write access', function () {
    const acl = ACL.fromJSON([
      {
        level: AccessLevel.ReadLevel,
        role: 'Driver'
      },
      {
        level: AccessLevel.ReadLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.WriteLevel,
        role: 'Passenger'
      }
    ]);

    expect(acl.hasReadAccess(Passenger)).to.be.true;
    expect(acl.hasWriteAccess(Passenger)).to.be.true;

    acl.removeReadAccess(Passenger);
    expect(acl.hasReadAccess(Passenger)).to.be.false;

    acl.removeWriteAccess(Passenger);
    expect(acl.hasReadAccess(Passenger)).to.be.false;
  });

});
/* eslint-enable no-unused-expressions */
