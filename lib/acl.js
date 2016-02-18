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
import Role from './role';

/*eslint-disable */
export default class ACL {

  constructor(attrs) {
    // TODO: ACL constructor
    console.error("Not yet implemented");
  }

  toJSON() {
    // TODO: to JSON
    console.error("Not yet implemented");
    return {
    };
  }

  addPublicReadAccess(role) {
    this.addReadAccess(Role.Public)
  }

  removePublicReadAccess(role) {
    this.removeReadAccess(Role.Public);
  }

  addPublicWriteAccess(role) {
    this.addWriteAccess(Role.Public);
  }

  removePublicWriteAccess(role) {
    this.removeWriteAccess(Role.Public);
  }

  addReadAccess(role) {
    // TODO: add read access
    console.error("Not yet implemented");
  }

  removeReadAccess(role) {
    // TODO: remove read access
    console.error("Not yet implemented");
  }

  addWriteAccess(role) {
    // TODO: add write access
    console.error("Not yet implemented");
  }

  removeWriteAccess(role) {
    // TODO: remove write access
    console.error("Not yet implemented");
  }

  static defaultACL() {
    // TODO: default ACL
    console.error("Not yet implemented");
  }

  static fromJSON(attrs) {
    return new ACL(attrs);
  }

}
/*eslint-enable */
