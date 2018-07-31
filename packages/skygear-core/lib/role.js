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

const definedRoles = {};

/**
 * Role
 */
export default class Role {

  /**
   * Constructs a new Role object.
   *
   * @param  {String} name - role name
   */
  constructor(name) {
    if (!Role.isValidName(name)) {
      throw new Error(
        'Role name is not valid. Please start with alphanumeric string.');
    }

    this._name = name;
  }

  /**
   * Role name
   *
   * @type {String}
   */
  get name() {
    return this._name;
  }

  /**
   * @private
   */
  static isValidName(name) {
    if (!name) {
      return false;
    }

    return true;
  }

  /**
   * @private
   */
  static define(name) {
    var defined = definedRoles[name];
    if (defined !== undefined) {
      return defined;
    }

    defined = new Role(name);
    definedRoles[name] = defined;

    return defined;
  }

  /**
   * Adds a role to a collection of roles without duplication.
   *
   * @param  {Role[]} roles - collection of roles
   * @param  {Role} aRole - role to be added
   * @return {Role[]}
   */
  static union(roles, aRole) {
    let duplicatedRole = _.find(roles, function (perRole) {
      return perRole.name === aRole.name;
    });

    if (duplicatedRole === undefined) {
      return _.union(roles, [aRole]);
    } else {
      return roles;
    }
  }

  /**
   * Removes a role to a collection of roles.
   *
   * @param  {Role[]} roles - collection of roles
   * @param  {Role} aRole - role to be removed
   * @return {Role[]}
   */
  static subtract(roles, aRole) {
    return _.filter(roles, function (perRole) {
      return perRole.name !== aRole.name;
    });
  }

  /**
   * Checks if a collection of roles contain a role.
   *
   * @param  {Role[]} roles - collection of role
   * @param  {Role} aRole - target role
   * @return {Boolean}
   */
  static contain(roles, aRole) {
    return _.find(roles, function (perRole) {
      return perRole.name === aRole.name;
    }) !== undefined;
  }
}

export function isRole(obj) {
  return obj instanceof Role;
}
