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
    attrs = attrs || {};
    this.level = attrs.level || AccessLevel.ReadLevel;
    if (attrs.role) {
      this.role = attrs.role;
    } else {
      this.public = true;
    }
  }

  toJSON() {
    let json = { level: this.level };
    if (this.role) {
      json.role = this.role.name;
    } else {
      json.public = true;
    }

    return json;
  }

  static fromJSON(attrs) {
    return new ACLEntry({
      level: attrs.level,
      role: attrs.role ? Role.define(attrs.role) : undefined
    });
  }
}

export default class ACL {
  constructor(attrs) {
    let entries = [];
    if (attrs) {
      _.forEach(attrs, function (perAttr) {
        entries.push(ACLEntry.fromJSON(perAttr));
      });
    } else {
      // create default ACL Entry: public readable
      entries.push(new ACLEntry());
    }

    this.entries = entries;
  }

  toJSON() {
    return _.map(this.entries, function (perEntry) {
      return perEntry.toJSON();
    });
  }

  addPublicReadAccess() {
    let matched = this._accessEntry(AccessLevel.ReadLevel);

    if (matched === undefined) {
      this.entries.push(ACLEntry.fromJSON({
        level: AccessLevel.ReadLevel
      }));
    }
  }

  removePublicReadAccess() {
    this.entries = _.filter(this.entries, (perEntry) => {
      return perEntry.level !== AccessLevel.ReadLevel ||
        perEntry.public !== true;
    });
  }

  addPublicWriteAccess() {
    let matched = this._accessEntry(AccessLevel.WriteLevel);

    if (matched === undefined) {
      this.entries.push(ACLEntry.fromJSON({
        level: AccessLevel.WriteLevel
      }));
    }
  }

  removePublicWriteAccess() {
    this.entries = _.filter(this.entries, (perEntry) => {
      return perEntry.level !== AccessLevel.WriteLevel ||
        perEntry.public !== true;
    });
  }

  hasPublicReadAccess() {
    return this.hasReadAccess();
  }

  hasPublicWriteAccess() {
    return this.hasWriteAccess();
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
    this.entries = _.filter(this.entries, (perEntry) => {
      return perEntry.level !== AccessLevel.ReadLevel ||
        !perEntry.role ||
        perEntry.role.name !== role.name;
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
    this.entries = _.filter(this.entries, (perEntry) => {
      return perEntry.level !== AccessLevel.WriteLevel ||
        !perEntry.role ||
        perEntry.role.name !== role.name;
    });
  }

  _accessEntry(accessLevel, role) {
    return _.find(this.entries, function (perEntry) {
      if (role) {
        return perEntry.level === accessLevel &&
          perEntry.role &&
          perEntry.role.name === role.name;
      } else {
        return perEntry.level === accessLevel &&
          perEntry.public === true;
      }
    });
  }

  hasReadAccess(role) {
    if (role && this._accessEntry(AccessLevel.ReadLevel, role) !== undefined) {
      return true;
    }

    return this._accessEntry(AccessLevel.ReadLevel) !== undefined;
  }

  hasWriteAccess(role) {
    if (role && this._accessEntry(AccessLevel.WriteLevel, role) !== undefined) {
      return true;
    }

    return this._accessEntry(AccessLevel.WriteLevel) !== undefined;
  }

  static fromJSON(attrs) {
    return new ACL(attrs);
  }

}
