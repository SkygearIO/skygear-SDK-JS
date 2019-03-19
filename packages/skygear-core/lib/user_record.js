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
import uuid from 'uuid';
import _ from 'lodash';
import {toJSON, fromJSON} from './util';
import deprecate from 'util-deprecate';

const _metaAttrs = {
  _created_at: { //eslint-disable-line
    parser: (v) => {
      return new Date(v);
    },
    stringify: (v) => {
      return v.toJSON();
    },
    newKey: 'createdAt'
  },
  _updated_at: { //eslint-disable-line
    parser: (v) => {
      return new Date(v);
    },
    stringify: (v) => {
      return v.toJSON();
    },
    newKey: 'updatedAt'
  },
  _ownerID: {
    parser: (v) => {
      return v;
    },
    stringify: (v) => {
      return v;
    },
    newKey: 'ownerID'
  },
  _created_by: { //eslint-disable-line
    parser: (v) => {
      return v;
    },
    stringify: (v) => {
      return v;
    },
    newKey: 'createdBy'
  },
  _updated_by: { //eslint-disable-line
    parser: (v) => {
      return v;
    },
    stringify: (v) => {
      return v;
    },
    newKey: 'updatedBy'
  },
  _deleted: {
    parser: (v) => {
      return JSON.parse(v);
    },
    newKey: 'deleted'
  }
};

const _metaKeys = _.reduce(_metaAttrs, function (result, value, key) {
  result[value.newKey] = key;
  return result;
}, {});

/**
 * UserRecord provides the model for Skygear User.
 *
 */
export default class UserRecord {

  constructor(attrs) {
    let {
      _recordID,
      ...otherAttrs
    } = attrs || {};

    this._recordType = 'user';
    this._recordID = _recordID || uuid.v4();

    this.update(otherAttrs);
  }

  /**
   * Type of the record.
   *
   * @type {String}
   */
  get recordType() {
    return this._recordType;
  }

  /**
   * ID of the record.
   *
   * @type {String}
   */
  get recordID() {
    return this._recordID;
  }

  /**
   * @private
   */
  get getDeprecatedID() {
    return deprecate(
      () => [this.recordType, this.recordID].join('/'),
      'A deprecated record ID representation, i.e. `record.id`, is accessed. ' +
        'This will not be supported in the coming version.'
    );
  }

  /**
   * ID of the record in the deprecated format (i.e. `type/id`).
   *
   * @type {String}
   *
   * @deprecated Use `recordType` and `recordID` instead.
   */
  get id() {
    return this.getDeprecatedID();
  }

  /**
   * Gets all keys of attributes of the records. Skygear reserved keys, that is
   * underscore prefixed keys, are excluded.
   *
   * @type {String[]}
   */
  get attributeKeys() {
    let keys = Object.keys(this);
    return _.filter(keys, function (value) {
      return value.indexOf('_') !== 0 && !(value in _metaKeys);
    });
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
      if (key.indexOf('_') !== 0) {
        if (_.isPlainObject(value)) {
          this[key] = fromJSON(value);
        } else {
          this[key] = value;
        }
      } else if (key in _metaAttrs) {
        const meta = _metaAttrs[key];
        const parser = meta.parser;
        if (parser) {
          this[meta.newKey] = parser(value);
        }
      }
    });
  }

  /**
   * Serializes Record to a JSON object.
   *
   * @return {Object} the JSON object
   */
  toJSON() {
    const result = _.reduce(this.metaKeys, (payload, key) => {
      const value = this[key];
      if (value === undefined) {
        throw new Error(`Unsupported undefined value of record key: ${key}`);
      }
      if (key in _metaKeys) {
        const meta = _metaAttrs[_metaKeys[key]];
        const stringify = meta.stringify;
        if (stringify) {
          payload[_metaKeys[key]] = stringify(value);
        }
      } else {
        payload[key] = toJSON(value);
      }
      return payload;
    }, this.toTruncatedJSON());

    if (!_.isEmpty(this._transient)) {
      result._transient = toJSON(this._transient);
    }
    return result;
  }

  /**
   * Serializes Record to a JSON object without metadata keys.
   *
   * @return {Object} the JSON object
   */
  toTruncatedJSON() {
    return _.reduce(this.attributeKeys, (payload, key) => {
      const value = this[key];
      if (value === undefined) {
        throw new Error(`Unsupported undefined value of record key: ${key}`);
      }
      payload[key] = toJSON(value);
      return payload;
    }, {
      _id: [this.recordType, this.recordID].join('/'),
      _recordType: this.recordType,
      _recordID: this.recordID
    });
  }

}

/**
 * Returns whether an object is a Skygear UserRecord.
 *
 * @return {Boolean} true if the specified object is a Skygear UserRecord.
 */
export function isUserRecord(obj) {
  return obj instanceof UserRecord && obj.recordType === 'user';
}
