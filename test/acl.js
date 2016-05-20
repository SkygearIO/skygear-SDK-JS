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

 /*eslint camelcase: [2, {properties: "never"}]*/
import {expect} from 'chai';
import Role from '../lib/role';
import User from '../lib/user';
import ACL, {AccessLevel} from '../lib/acl';

describe('ACL', function () {
  let Driver = Role.define('Driver');
  let Passenger = Role.define('Passenger');
  let Alice = new User({
    user_id: 'Alice',
    roles: ['Driver']
  });
  let Bob = new User({
    user_id: 'Bob',
    roles: ['Passenger']
  });
  it('serialization', function () {
    const payload = [
      {
        level: AccessLevel.ReadOnlyLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.ReadWriteLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.ReadOnlyLevel,
        role: 'Driver'
      },
      {
        level: AccessLevel.ReadOnlyLevel,
        user_id: 'Bob'
      },
      {
        level: AccessLevel.ReadWriteLevel,
        user_id: 'Bob'
      },
      {
        level: AccessLevel.ReadOnlyLevel,
        user_id: 'Alice'
      }
    ];

    const acl = ACL.fromJSON(payload);
    expect(acl.toJSON()).eql([
      {
        level: AccessLevel.ReadWriteLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.ReadOnlyLevel,
        role: 'Driver'
      },
      {
        level: AccessLevel.ReadWriteLevel,
        user_id: 'Bob'
      },
      {
        level: AccessLevel.ReadOnlyLevel,
        user_id: 'Alice'
      }
    ]);
  });

  it('deserialization', function () {
    const payload = [
      {
        level: AccessLevel.ReadOnlyLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.ReadWriteLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.ReadOnlyLevel,
        role: 'Driver'
      },
      {
        level: AccessLevel.ReadOnlyLevel,
        user_id: 'Bob'
      },
      {
        level: AccessLevel.ReadWriteLevel,
        user_id: 'Bob'
      },
      {
        level: AccessLevel.ReadOnlyLevel,
        user_id: 'Alice'
      }
    ];

    const acl = ACL.fromJSON(payload);
    expect(acl).to.be.an.instanceof(ACL);
  });

  it('user have access', function () {
    const acl = ACL.fromJSON([
      {
        level: AccessLevel.ReadOnlyLevel,
        user_id: 'Bob'
      },
      {
        level: AccessLevel.ReadWriteLevel,
        user_id: 'Bob'
      }
    ]);

    expect(acl.hasReadAccessForUser(Alice)).to.be.false();
    expect(acl.hasReadAccessForUser(Bob)).to.be.true();
    expect(acl.hasWriteAccessForUser(Bob)).to.be.true();
  });

  it('role have access', function () {
    const acl = ACL.fromJSON([
      {
        level: AccessLevel.ReadOnlyLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.ReadWriteLevel,
        role: 'Passenger'
      }
    ]);

    expect(acl.hasReadAccessForRole(Driver)).to.be.false();
    expect(acl.hasReadAccessForRole(Passenger)).to.be.true();
    expect(acl.hasWriteAccessForRole(Passenger)).to.be.true();
    expect(acl.hasReadAccessForUser(Alice)).to.be.false();
    expect(acl.hasReadAccessForUser(Bob)).to.be.true();
    expect(acl.hasWriteAccessForUser(Bob)).to.be.true();

  });

  it('public have access', function () {
    const nobodyAccessiable = ACL.fromJSON([]);
    const publicReadable = ACL.fromJSON();
    const publicReadWritable = ACL.fromJSON([
      {
        level: AccessLevel.ReadOnlyLevel,
        public: true
      },
      {
        level: AccessLevel.ReadWriteLevel,
        public: true
      }
    ]);

    expect(nobodyAccessiable.hasReadAccessForRole(Driver)).to.be.false();
    expect(nobodyAccessiable.hasReadAccessForUser(Alice)).to.be.false();

    expect(publicReadable.hasReadAccessForRole(Passenger)).to.be.true();
    expect(publicReadable.hasReadAccessForUser(Bob)).to.be.true();
    expect(publicReadable.hasPublicReadAccess()).to.be.true();
    expect(publicReadable.hasPublicWriteAccess()).to.be.false();

    expect(publicReadWritable.hasWriteAccessForRole(Passenger)).to.be.true();
    expect(publicReadWritable.hasWriteAccessForUser(Bob)).to.be.true();
    expect(publicReadWritable.hasPublicReadAccess()).to.be.true();
    expect(publicReadWritable.hasPublicWriteAccess()).to.be.true();
  });

  it('set user access', function () {
    let acl = ACL.fromJSON([
      {
        level: AccessLevel.ReadOnlyLevel,
        user_id: 'Alice'
      },
      {
        level: AccessLevel.ReadOnlyLevel,
        user_id: 'Bob'
      },
      {
        level: AccessLevel.ReadWriteLevel,
        user_id: 'Bob'
      }
    ]);

    expect(acl.hasReadAccessForUser(Alice)).to.be.true();

    acl.setReadOnlyForUser(Alice);
    expect(acl.hasReadAccessForUser(Alice)).to.be.true();
    expect(acl.hasWriteAccessForUser(Alice)).to.be.false();
    expect(acl.hasWriteAccessForUser(Bob)).to.be.true();

    acl.setReadWriteAccessForUser(Alice);
    expect(acl.hasReadAccessForUser(Alice)).to.be.true();
    expect(acl.hasWriteAccessForUser(Alice)).to.be.true();
    expect(acl.hasWriteAccessForUser(Bob)).to.be.true();
  });

  it('set role access', function () {
    let acl = ACL.fromJSON([
      {
        level: AccessLevel.ReadOnlyLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.ReadWriteLevel,
        role: 'Passenger'
      }
    ]);

    expect(acl.hasReadAccessForRole(Driver)).to.be.false();
    expect(acl.hasWriteAccessForRole(Driver)).to.be.false();

    acl.setReadOnlyForRole(Driver);
    expect(acl.hasReadAccessForRole(Driver)).to.be.true();
    expect(acl.hasReadAccessForUser(Alice)).to.be.true();

    acl.setReadWriteAccessForRole(Driver);
    expect(acl.hasWriteAccessForRole(Driver)).to.be.true();
    expect(acl.hasWriteAccessForUser(Alice)).to.be.true();

    acl = ACL.fromJSON([
      {
        level: AccessLevel.ReadOnlyLevel,
        role: 'Driver'
      },
      {
        level: AccessLevel.ReadOnlyLevel,
        role: 'Passenger'
      },
      {
        level: AccessLevel.ReadWriteLevel,
        role: 'Passenger'
      }
    ]);

    expect(acl.hasReadAccessForRole(Passenger)).to.be.true();
    expect(acl.hasWriteAccessForRole(Passenger)).to.be.true();
    expect(acl.hasReadAccessForUser(Bob)).to.be.true();
    expect(acl.hasWriteAccessForUser(Bob)).to.be.true();

    acl.setReadOnlyForRole(Passenger);
    expect(acl.hasWriteAccessForRole(Passenger)).to.be.false();
    expect(acl.hasWriteAccessForUser(Bob)).to.be.false();

    acl.setNoAccessForRole(Passenger);
    expect(acl.hasReadAccessForRole(Passenger)).to.be.false();
    expect(acl.hasReadAccessForUser(Bob)).to.be.false();
  });

  it('set public access', function () {
    let acl = ACL.fromJSON([]);

    expect(acl.hasPublicReadAccess()).to.be.false();
    expect(acl.hasPublicWriteAccess()).to.be.false();

    acl.setPublicReadOnly();
    expect(acl.hasPublicReadAccess()).to.be.true();

    acl.setPublicReadWriteAccess();
    expect(acl.hasPublicWriteAccess()).to.be.true();

    expect(acl.toJSON()).to.be.eql([
      {
        level: AccessLevel.ReadWriteLevel,
        public: true
      }
    ]);

    acl = ACL.fromJSON([
      {
        level: AccessLevel.ReadOnlyLevel,
        public: true
      },
      {
        level: AccessLevel.ReadWriteLevel,
        public: true
      }
    ]);

    expect(acl.hasPublicReadAccess()).to.be.true();
    expect(acl.hasPublicWriteAccess()).to.be.true();

    acl.setPublicReadOnly();
    expect(acl.hasPublicWriteAccess()).to.be.false();

    acl.setPublicNoAccess();
    expect(acl.hasPublicReadAccess()).to.be.false();

    expect(acl.toJSON()).to.be.eql([]);
  });

  it('default ACL', function () {
    const acl = new ACL();

    expect(acl.public).to.equal(AccessLevel.ReadOnlyLevel);
    expect(Object.keys(acl.roles)).to.have.length(0);
  });

});
