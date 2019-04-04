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
import {toJSON, fromJSON} from './util';

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
  last_login_at: { //eslint-disable-line
    parser: (v) => {
      return new Date(v);
    },
    stringify: (v) => {
      return v.toJSON();
    },
    newKey: 'lastLoginAt'
  },
  last_seen_at: { //eslint-disable-line
    parser: (v) => {
      return new Date(v);
    },
    stringify: (v) => {
      return v.toJSON();
    },
    newKey: 'lastSeenAt'
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
  },
  login_ids: { //eslint-disable-line
    parser: (v) => {
      return fromJSON(v);
    },
    stringify: (v) => {
      return toJSON(v);
    },
    newKey: 'loginIDs'
  }
};

const _METADATAKEY = 'metadata';

/**
 * User provides the model for Skygear User.
 *
 */
export default class User {

  constructor(attrs) {
    if (!attrs) {
      return;
    }

    _.each(_metaAttrs, (meta, key) => {
      const newKey = meta.newKey;
      const parser = meta.parser;
      const value = attrs[key];
      if (value && newKey && parser) {
        this[newKey] = parser(value);
      }
    });

    this[_METADATAKEY] = fromJSON(attrs[_METADATAKEY]);
  }

  /**
   * Serializes Record to a JSON object.
   *
   * @return {Object} the JSON object
   */
  toJSON() {
    const result = {};

    _.each(_metaAttrs, (meta, key) => {
      const newKey = meta.newKey;
      const stringify = meta.stringify;
      const value = this[newKey];
      if (value && stringify) {
        result[key] = stringify(value);
      }
    });

    if (this[_METADATAKEY]) {
      result[_METADATAKEY] = toJSON(this[_METADATAKEY]);
    }

    return result;
  }

}

/**
 * Returns whether an object is a Skygear User.
 *
 * @return {Boolean} true if the specified object is a Skygear User.
 */
export function isUser(obj) {
  return obj instanceof User;
}
