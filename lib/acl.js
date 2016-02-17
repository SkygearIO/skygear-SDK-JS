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
import _ from 'lodash';
import Role from './role';

export const AccessLevel = {
  ReadLevel: 'read',
  WriteLevel: 'write'
};

class ACLEntry {
  constructor(attrs) {
    this.level = attrs.level || AccessLevel.ReadLevel;
    this.role = attrs.role || Role.publicRole;
  }

  toJSON() {
    return {
      level: this.level,
      role: this.role.name
    };
  }

  static fromJSON(attrs) {
    return new ACLEntry({
      level: attrs.level,
      role: Role.define(attrs.role)
    });
  }
}

export default class ACL {
  constructor(attrs) {
    let entries = [];
    if (attrs && attrs.length > 0) {
      _.forEach(attrs, function (perAttr) {
        entries.push(ACLEntry.fromJSON(perAttr));
      });
    } else {
      // create default ACL: public readable
      // TODO: apply default ACL
      entries.push(ACLEntry.fromJSON({
        level: AccessLevel.ReadLevel,
        role: Role.Public.name
      }));
    }

    this.entries = entries;
  }

  toJSON() {
    return _.map(this.entries, function (perEntry) {
      return perEntry.toJSON();
    });
  }

  addPublicReadAccess() {
    this.addReadAccess(Role.Public);
  }

  removePublicReadAccess() {
    this.removeReadAccess(Role.Public);
  }

  addPublicWriteAccess() {
    this.addWriteAccess(Role.Public);
  }

  removePublicWriteAccess() {
    this.removeWriteAccess(Role.Public);
  }

  addReadAccess(role) {
    let matched = this._accessEntry(AccessLevel.ReadLevel, role);

    if (matched === undefined) {
      this.entries.push(ACLEntry.fromJSON({
        level: AccessLevel.ReadLevel,
        role: role.name
      }));
    }
  }

  removeReadAccess(role) {
    this.entries = _.dropWhile(this.entries, function (perEntry) {
      return perEntry.level === AccessLevel.ReadLevel &&
        perEntry.role.name === role.name;
    });
  }

  addWriteAccess(role) {
    let matched = this._accessEntry(AccessLevel.WriteLevel, role);

    if (matched === undefined) {
      this.entries.push(ACLEntry.fromJSON({
        level: AccessLevel.WriteLevel,
        role: role.name
      }));
    }
  }

  removeWriteAccess(role) {
    this.entries = _.dropWhile(this.entries, function (perEntry) {
      return perEntry.level === AccessLevel.WriteLevel &&
        perEntry.role.name === role.name;
    });
  }

  _accessEntry(accessLevel, role) {
    return _.find(this.entries, function (perEntry) {
      return perEntry.level === accessLevel &&
        perEntry.role.name === role.name;
    });
  }

  hasReadAccess(role) {
    return this._accessEntry(AccessLevel.ReadLevel, role) !== undefined ||
      this._accessEntry(AccessLevel.ReadLevel, Role.Public) !== undefined;
  }

  hasWriteAccess(role) {
    return this._accessEntry(AccessLevel.WriteLevel, role) !== undefined ||
      this._accessEntry(AccessLevel.WriteLevel, Role.Public) !== undefined;
  }

  static defaultACL() {
    // TODO: default ACL
    console.error('Not yet implemented');
  }

  static fromJSON(attrs) {
    return new ACL(attrs);
  }

}
