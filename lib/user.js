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

export default class User {

  constructor(attrs) {
    let id = attrs.user_id || attrs._id; //eslint-disable-line
    if (!_.isString(id)) {
      throw new Error(
        'Missing user_id.');
    }
    this.email = attrs.email;
    this.username = attrs.username;
    this.id = id;

    this.roles = [];
    if (attrs.roles) {
      this.roles = _.map(attrs.roles, Role.fromJSON);
    }
  }

  toJSON() {
    return {
      user_id: this.id, //eslint-disable-line
      username: this.username,
      email: this.email,
      roles: _.map(this.roles, function (perRole) {
        return perRole.toJSON();
      })
    };
  }

  addRole(role) {
    this.roles = Role.union(this.roles, role);
  }

  removeRole(role) {
    this.roles = Role.subtract(this.roles, role);
  }

  static fromJSON(attrs) {
    return new User(attrs);
  }

}
