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
import Record from './record';

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

/**
 * Access Control List
 *
 * It describes the read and write permission of a record to public, specific
 * roles or users.
 */
export default class ACL {

  /**
   * Constructs a new ACL object.
   *
   * @param  {Object[]} attrs
   */
  constructor(attrs) {
    // default ACL: public read only
    this.public = AccessLevel.ReadOnlyLevel;
    this.roles = {};
    this.users = {};

    if (attrs) {
      this.public = AccessLevel.NoAccessLevel;

      _.forEach(attrs, (perAttr) => {
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
          let currentLevel = this.users[perAttr.user_id];
          if (accessLevelNumber(perAttr.level) >
            accessLevelNumber(currentLevel)
          ) {
            this.users[perAttr.user_id] = perAttr.level;
          }
        } else {
          throw new Error('Invalid ACL Entry: ' + JSON.stringify(perAttr));
        }
      });
    }
  }

  /**
   * Serializes ACL to a JSON object.
   */
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

  /**
   * Sets public to have no access.
   */
  setPublicNoAccess() {
    this.public = AccessLevel.NoAccessLevel;
  }

  /**
   * Sets public to have read access only.
   */
  setPublicReadOnly() {
    this.public = AccessLevel.ReadOnlyLevel;
  }

  /**
   * Sets public to have both read and write access.
   */
  setPublicReadWriteAccess() {
    this.public = AccessLevel.ReadWriteLevel;
  }

  /**
   * Sets a specific role to have no access.
   *
   * @param {Role} role - the role
   */
  setNoAccessForRole(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    this.roles[role.name] = AccessLevel.NoAccessLevel;
  }

  /**
   * Sets a specific role to have read access only.
   *
   * @param {Role} role - the role
   */
  setReadOnlyForRole(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    this.roles[role.name] = AccessLevel.ReadOnlyLevel;
  }

  /**
   * Sets a specific role to have read and write access.
   *
   * @param {Role} role - the role
   */
  setReadWriteAccessForRole(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    this.roles[role.name] = AccessLevel.ReadWriteLevel;
  }

  /**
   * Sets a specific user to have no access.
   *
   * @param {Record} user - the user record
   */
  setNoAccessForUser(user) {
    if (!user || !(user instanceof Record) || !(user.recordType === 'user')) {
      throw new Error(user + ' is not a user.');
    }

    this.users[user._id] = AccessLevel.NoAccessLevel;
  }

  /**
   * Sets a specific user to have read access only.
   *
   * @param {Record} user - the user record
   */
  setReadOnlyForUser(user) {
    if (!user || !(user instanceof Record) || !(user.recordType === 'user')) {
      throw new Error(user + ' is not a user.');
    }

    this.users[user._id] = AccessLevel.ReadOnlyLevel;
  }

  /**
   * Sets a specific user to have read and write access.
   *
   * @param {Record} user - the user record
   */
  setReadWriteAccessForUser(user) {
    if (!user || !(user instanceof Record) || !(user.recordType === 'user')) {
      throw new Error(user + ' is not a user.');
    }

    this.users[user._id] = AccessLevel.ReadWriteLevel;
  }

  /**
   * Checks if public has read access.
   *
   * @return {Boolean} true if public has read access
   */
  hasPublicReadAccess() {
    return accessLevelNumber(this.public) >=
      accessLevelNumber(AccessLevel.ReadOnlyLevel);
  }

  /**
   * Checks if public has write access.
   *
   * @return {Boolean} true if public has write access
   */
  hasPublicWriteAccess() {
    return accessLevelNumber(this.public) ===
      accessLevelNumber(AccessLevel.ReadWriteLevel);
  }

  /**
   * Checks if the specific role has read access.
   *
   * @param {Role} role - the role
   * @return {Boolean} true if the role has read access
   */
  hasReadAccessForRole(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    return this.hasPublicReadAccess() ||
      accessLevelNumber(this.roles[role.name]) >=
        accessLevelNumber(AccessLevel.ReadOnlyLevel);
  }

  /**
   * Checks if the specific role has write access.
   *
   * @param {Role} role - the role
   * @return {Boolean} true if the role has write access
   */
  hasWriteAccessForRole(role) {
    if (!role || !(role instanceof Role)) {
      throw new Error(role + ' is not a role.');
    }

    return this.hasPublicWriteAccess() ||
      accessLevelNumber(this.roles[role.name]) >=
        accessLevelNumber(AccessLevel.ReadWriteLevel);
  }

  /**
   * Checks if the specific user has read access.
   *
   * @param {Record} user - the user
   * @return {Boolean} true if the user has read access
   */
  hasReadAccessForUser(user) {
    if (!user || !(user instanceof Record) || !(user.recordType === 'user')) {
      throw new Error(user + ' is not a user.');
    }

    return this.hasPublicReadAccess() ||
      accessLevelNumber(this.users[user._id]) >=
        accessLevelNumber(AccessLevel.ReadOnlyLevel);
  }

  /**
   * Checks if the specific user has write access.
   *
   * @param {Record} user - the user
   * @return {Boolean} true if the user has write access
   */
  hasWriteAccessForUser(user) {
    if (!user || !(user instanceof Record) || !(user.recordType === 'user')) {
      throw new Error(user + ' is not a user.');
    }

    return this.hasPublicWriteAccess() ||
      accessLevelNumber(this.users[user._id]) >=
        accessLevelNumber(AccessLevel.ReadWriteLevel);
  }

  /**
   * Checks if the specific user and role has read access.
   *
   * @param {Record} user - the user
   * @param {Role[]} roles - roles
   * @return {Boolean} true if the user and roles has read access
   */
  hasReadAccess(user, roles) {
    if (this.hasReadAccessForUser(user)) {
      return true;
    }

    for (let role of roles) {
      if (this.hasReadAccessForRole(role)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if the specific user and role has write access.
   *
   * @param {Record} user - the user
   * @param {Role[]} roles - roles
   * @return {Boolean} true if the user and roles has write access
   */
  hasWriteAccess(user, roles) {
    if (this.hasWriteAccessForUser(user)) {
      return true;
    }

    for (let role of roles) {
      if (this.hasWriteAccessForRole(role)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Constructs a new ACL object from JSON object.
   *
   * @param  {Object} attrs - the JSON object
   * @return {ACL} the created acl object
   */
  static fromJSON(attrs) {
    return new ACL(attrs);
  }

}
