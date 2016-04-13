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
  NoAccessLevel: null,
  ReadOnlyLevel: 'read',
  ReadWriteLevel: 'write'
};

const AccessLevelMap = {
  [AccessLevel.NoAccessLevel]: 0,
  [AccessLevel.ReadOnlyLevel]: 1,
  [AccessLevel.ReadWriteLevel]: 2
};

function accessLevelNumber(level) {
  return AccessLevelMap[level] || 0;
}

class ACLEntry {
  constructor(attrs) {
    attrs = attrs || {};
    this.level = attrs.level || AccessLevel.ReadOnlyLevel;
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
    // default ACL: public read only
    this.public = AccessLevel.ReadOnlyLevel;
    this.roles = {};

    if (attrs) {
      this.public = AccessLevel.NoAccessLevel;

      let self = this;
      _.forEach(attrs, function (perAttr) {
        const newAce = ACLEntry.fromJSON(perAttr);
        if (newAce.public) {
          if (accessLevelNumber(newAce.level) >
            accessLevelNumber(self.public)
          ) {
            self.public = newAce.level;
          }
        } else if (newAce.role) {
          let currentLevel = self.roles[newAce.role.name];
          if (accessLevelNumber(newAce.level) >
            accessLevelNumber(currentLevel)
          ) {
            self.roles[newAce.role.name] = newAce.level;
          }
        }
      });
    }
  }

  toJSON() {
    let json = [];
    if (this.public) {
      json.push({
        public: true,
        level: this.public
      });
    }

    _.map(this.roles, function (perRoleLevel, perRoleName) {
      if (perRoleLevel) {
        json.push({
          role: perRoleName,
          level: perRoleLevel
        });
      }
    });

    return json;
  }

  setPublicNoAccess() {
    this.public = AccessLevel.NoAccessLevel;
  }

  setPublicReadOnly() {
    this.public = AccessLevel.ReadOnlyLevel;
  }

  setPublicReadWriteAccess() {
    this.public = AccessLevel.ReadWriteLevel;
  }

  setNoAccessForRole(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    this.roles[role.name] = AccessLevel.NoAccessLevel;
  }

  setReadOnlyForRole(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    this.roles[role.name] = AccessLevel.ReadOnlyLevel;
  }

  setReadWriteAccessForRole(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    this.roles[role.name] = AccessLevel.ReadWriteLevel;
  }

  hasPublicReadAccess() {
    return accessLevelNumber(this.public) >=
      accessLevelNumber(AccessLevel.ReadOnlyLevel);
  }

  hasPublicWriteAccess() {
    return accessLevelNumber(this.public) ===
      accessLevelNumber(AccessLevel.ReadWriteLevel);
  }

  hasReadAccess(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    return this.hasPublicReadAccess() ||
      accessLevelNumber(this.roles[role.name]) >=
        accessLevelNumber(AccessLevel.ReadOnlyLevel);
  }

  hasWriteAccess(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    return this.hasPublicWriteAccess() ||
      accessLevelNumber(this.roles[role.name]) >=
        accessLevelNumber(AccessLevel.ReadWriteLevel);
  }

  static fromJSON(attrs) {
    return new ACL(attrs);
  }

}
