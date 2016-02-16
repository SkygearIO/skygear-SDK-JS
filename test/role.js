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

describe('role', function () {
  it('normally role definition', function () {
    let Boss = Role.define('Boss');
    expect(Boss).to.be.an.instanceof(Role);
    expect(Boss.roleName).to.be.eql('Boss');
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
});
