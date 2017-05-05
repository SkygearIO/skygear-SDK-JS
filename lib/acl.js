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
import User from './user';

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
    this.users = {};

    if (attrs) {
      this.public = AccessLevel.NoAccessLevel;

      _.forEach(attrs, (perAttr)=> {
        perAttr.level = perAttr.level || AccessLevel.ReadOnlyLevel;
        if (perAttr.public) {
          if (accessLevelNumber(perAttr.level) >
            accessLevelNumber(this.public)
          ) {
            this.public = perAttr.level;
          }
        } else if (perAttr.role) {
          let theRole = Role.define(perAttr.role);
          let currentLevel = this.roles[theRole.name];
          if (accessLevelNumber(perAttr.level) >
            accessLevelNumber(currentLevel)
          ) {
            this.roles[theRole.name] = perAttr.level;
          }
        } else if (perAttr.user_id) {
          let theUser = new User({user_id: perAttr.user_id}); //eslint-disable-line
          let currentLevel = this.users[theUser.id];
          if (accessLevelNumber(perAttr.level) >
            accessLevelNumber(currentLevel)
          ) {
            this.users[theUser.id] = perAttr.level;
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

    _.each(this.roles, function (perRoleLevel, perRoleName) {
      if (perRoleLevel) {
        json.push({
          role: perRoleName,
          level: perRoleLevel
        });
      }
    });

    _.each(this.users, function (perUserLevel, perUserId) {
      if (perUserLevel) {
        json.push({
          user_id: perUserId, //eslint-disable-line
          level: perUserLevel
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

  setNoAccessForUser(user) {
    if (!user || !(user instanceof User)) {
      throw new Error(user + ' is not a user.');
    }

    this.users[user.id] = AccessLevel.NoAccessLevel;
  }

  setReadOnlyForUser(user) {
    if (!user || !(user instanceof User)) {
      throw new Error(user + ' is not a user.');
    }

    this.users[user.id] = AccessLevel.ReadOnlyLevel;
  }

  setReadWriteAccessForUser(user) {
    if (!user || !(user instanceof User)) {
      throw new Error(user + ' is not a user.');
    }

    this.users[user.id] = AccessLevel.ReadWriteLevel;
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
    return this.hasReadAccessForRole(role);
  }

  hasWriteAccess(role) {
    return this.hasWriteAccessForRole(role);
  }

  hasReadAccessForRole(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    return this.hasPublicReadAccess() ||
      accessLevelNumber(this.roles[role.name]) >=
        accessLevelNumber(AccessLevel.ReadOnlyLevel);
  }

  hasWriteAccessForRole(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    return this.hasPublicWriteAccess() ||
      accessLevelNumber(this.roles[role.name]) >=
        accessLevelNumber(AccessLevel.ReadWriteLevel);
  }

  hasReadAccessForUser(user) {
    if (!user || !(user instanceof User)) {
      throw new Error(user + ' is not a user.');
    }

    const roles = user.roles;

    if (this.hasPublicReadAccess() ||
    accessLevelNumber(this.users[user.id]) >=
    accessLevelNumber(AccessLevel.ReadOnlyLevel)) {
      return true;
    }

    for (let role of roles) {
      if (this.hasReadAccessForRole(role)) {
        return true;
      }
    }

    return false;
  }

  hasWriteAccessForUser(user) {
    if (!user || !(user instanceof User)) {
      throw new Error(user + ' is not a user.');
    }

    const roles = user.roles;

    if (this.hasPublicWriteAccess() ||
    accessLevelNumber(this.users[user.id]) >=
    accessLevelNumber(AccessLevel.ReadWriteLevel)) {
      return true;
    }

    for (let role of roles) {
      if (this.hasWriteAccessForRole(role)) {
        return true;
      }
    }

    return false;
  }

  static fromJSON(attrs) {
    return new ACL(attrs);
  }

}
