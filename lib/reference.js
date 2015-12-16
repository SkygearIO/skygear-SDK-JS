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
import Record from './record';

export default class Reference {

  constructor(attrs) {
    var id;
    if (typeof attrs === 'string') {
      id = attrs;
    } else {
      id = attrs.$id;
      if (!id) {
        id = attrs.id;
      }
    }

    if (!id) {
      throw new Error('Empty record id');
    }

    // parse solely to test for string id validity
    Record.parseID(id);

    this._id = id;
  }

  get id() {
    return this._id;
  }

  toJSON() {
    return {
      $id: this._id,
      $type: 'ref'
    };
  }
}
