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

export default class Role {
  constructor(name) {
    if (!Role.isValidName(name)) {
      throw new Error(
        'Role name is not valid. Please start with alphanumeric string.');
    }

    this._name = name;
  }

  get name() {
    return this._name;
  }

  static isValidName(name) {
    if (!name) {
      return false;
    }

    return true;
  }

  static define(name) {
    var defined = definedRoles[name];
    if (defined !== undefined) {
      return defined;
    }

    defined = new Role(name);
    definedRoles[name] = defined;

    return defined;
  }

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

  static subtract(roles, aRole) {
    return _.filter(roles, function (perRole) {
      return perRole.name !== aRole.name;
    });
  }

  static contain(roles, aRole) {
    return _.find(roles, function (perRole) {
      return perRole.name === aRole.name;
    }) !== undefined;
  }
}
