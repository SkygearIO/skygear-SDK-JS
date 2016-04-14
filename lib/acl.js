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

export default class ACL {
  constructor(attrs) {
    // default ACL: public read only
    this.public = AccessLevel.ReadOnlyLevel;
    this.roles = {};

    if (attrs) {
      this.public = AccessLevel.NoAccessLevel;

      let self = this;
      _.forEach(attrs, function (perAttr) {
        perAttr.level = perAttr.level || AccessLevel.ReadOnlyLevel;
        if (perAttr.public) {
          if (accessLevelNumber(perAttr.level) >
            accessLevelNumber(self.public)
          ) {
            self.public = perAttr.level;
          }
        } else if (perAttr.role) {
          let theRole = Role.define(perAttr.role);
          let currentLevel = self.roles[theRole.name];
          if (accessLevelNumber(perAttr.level) >
            accessLevelNumber(currentLevel)
          ) {
            self.roles[theRole.name] = perAttr.level;
          }
        } else {
          throw new Error('Invalid ACL Entry: ' + JSON.stringify(perAttr));
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
