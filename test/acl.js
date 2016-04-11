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

    expect(acl.hasReadAccess(Driver)).to.be.false();
    expect(acl.hasReadAccess(Passenger)).to.be.true();
    expect(acl.hasWriteAccess(Passenger)).to.be.true();
  });

  it('public have access', function () {
    const nobodyAccessiable = ACL.fromJSON([]);
    const publicReadable = ACL.fromJSON();
    const publicReadWritable = ACL.fromJSON([
      {
        level: AccessLevel.ReadLevel,
        public: true
      },
      {
        level: AccessLevel.WriteLevel,
        public: true
      }
    ]);

    expect(nobodyAccessiable.hasReadAccess(Driver)).to.be.false();

    expect(publicReadable.hasReadAccess(Passenger)).to.be.true();
    expect(publicReadable.hasPublicReadAccess()).to.be.true();
    expect(publicReadable.hasPublicWriteAccess()).to.be.false();

    expect(publicReadWritable.hasWriteAccess(Passenger)).to.be.true();
    expect(publicReadWritable.hasPublicReadAccess()).to.be.true();
    expect(publicReadWritable.hasPublicWriteAccess()).to.be.true();
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

    expect(acl.hasReadAccess(Driver)).to.be.false();
    expect(acl.hasWriteAccess(Driver)).to.be.false();

    acl.addReadAccess(Driver);
    expect(acl.hasReadAccess(Driver)).to.be.true();

    acl.addWriteAccess(Driver);
    expect(acl.hasWriteAccess(Driver)).to.be.true();
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

    expect(acl.hasReadAccess(Passenger)).to.be.true();
    expect(acl.hasWriteAccess(Passenger)).to.be.true();

    acl.removeReadAccess(Passenger);
    expect(acl.hasReadAccess(Passenger)).to.be.false();

    acl.removeWriteAccess(Passenger);
    expect(acl.hasWriteAccess(Passenger)).to.be.false();
  });

  it('add public read / write access', function () {
    const acl = ACL.fromJSON([]);

    expect(acl.hasPublicReadAccess()).to.be.false();
    expect(acl.hasPublicWriteAccess()).to.be.false();

    acl.addPublicReadAccess();
    expect(acl.hasPublicReadAccess()).to.be.true();

    acl.addPublicWriteAccess();
    expect(acl.hasPublicWriteAccess()).to.be.true();

    expect(acl.toJSON()).to.be.eql([
      {
        level: AccessLevel.ReadLevel,
        public: true
      },
      {
        level: AccessLevel.WriteLevel,
        public: true
      }
    ]);
  });

  it('remove public read / write access', function () {
    const acl = ACL.fromJSON([
      {
        level: AccessLevel.ReadLevel,
        public: true
      },
      {
        level: AccessLevel.WriteLevel,
        public: true
      }
    ]);

    expect(acl.hasPublicReadAccess()).to.be.true();
    expect(acl.hasPublicWriteAccess()).to.be.true();

    acl.removePublicReadAccess();
    expect(acl.hasPublicReadAccess()).to.be.false();

    acl.removePublicWriteAccess();
    expect(acl.hasPublicWriteAccess()).to.be.false();

    expect(acl.toJSON()).to.be.eql([]);
  });

  it('default ACL', function () {
    const acl = new ACL();
    const entries = acl.entries;

    expect(entries).to.have.length(1);

    let firstEntry = entries[0];
    expect(firstEntry.level).to.equal(AccessLevel.ReadLevel);
    expect(firstEntry.role).to.be.undefined();
    expect(firstEntry.public).to.be.true();

    expect(acl.toJSON()).eql([{
      level: AccessLevel.ReadLevel,
      public: true
    }]);
  });

});
