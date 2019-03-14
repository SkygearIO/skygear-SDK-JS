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
import {fromJSON} from './util';

const _metaAttrs = {
  user_id: { //eslint-disable-line
    parser: (v) => {
      return v;
    },
    stringify: (v) => {
      return v;
    },
    newKey: 'userID'
  },
  created_at: { //eslint-disable-line
    parser: (v) => {
      return new Date(v);
    },
    stringify: (v) => {
      return v.toJSON();
    },
    newKey: 'createdAt'
  },
  updated_at: { //eslint-disable-line
    parser: (v) => {
      return new Date(v);
    },
    stringify: (v) => {
      return v.toJSON();
    },
    newKey: 'updatedAt'
  },
  created_by: { //eslint-disable-line
    parser: (v) => {
      return v;
    },
    stringify: (v) => {
      return v;
    },
    newKey: 'createdBy'
  },
  updated_by: { //eslint-disable-line
    parser: (v) => {
      return v;
    },
    stringify: (v) => {
      return v;
    },
    newKey: 'updatedBy'
  }
};

/**
 * UserRecord provides the model for Skygear User.
 *
 */
export default class UserRecord {

  constructor(attrs) {
    this.update(attrs);
  }

  /**
   * Gets all keys of attributes of the records. Skygear reserved keys, that is
   * underscore prefixed keys, are excluded.
   *
   * @type {String[]}
   */
  get attributeKeys() {
    return Object.keys(this);
  }

  /**
   * Updates record attributes with a dictionary.
   *
   * @param  {Object} attrs
   */
  update(attrs) {
    _.each(this.attributeKeys, (key) => {
      delete this[key];
    });

    _.each(attrs, (value, key) => {
      if (key in _metaAttrs) {
        const meta = _metaAttrs[key];
        const parser = meta.parser;
        if (parser) {
          this[meta.newKey] = parser(value);
        }
      } else {
        if (_.isPlainObject(value)) {
          this[key] = fromJSON(value);
        } else {
          this[key] = value;
        }
      }
    });
  }

}

/**
 * Returns whether an object is a Skygear UserRecord.
 *
 * @return {Boolean} true if the specified object is a Skygear UserRecord.
 */
export function isUserRecord(obj) {
  return obj instanceof UserRecord;
}
