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

function mapObject(obj, fn) {
  // cannot use `map` directly
  // because array-like object would give integer key instead of string key
  // when calling map
  return _.chain(obj)
    .keys()
    .map((key) => {
      return [key, fn(key, obj[key])];
    })
    .fromPairs()
    .value();
}

/**
 * Returns the specified value to a JSON representation.
 *
 * It will descends into array and object to convert Skygear Data Type
 * into JSON representation. If the specified value is null, null is returned.
 *
 * This function is the opposite of fromJSON.
 *
 * @param {Object} v - the object or value value to convert to JSON
 * @return {Object} the result in JSON representation
 */
export function toJSON(v) {
  if (v === undefined) {
    throw new Error('toJSON does not support undefined value');
  }

  if (v === null) {
    return null;
  } else if (_.isArray(v)) {
    return _.map(v, toJSON);
  } else if (_.isDate(v)) {
    return {
      $type: 'date',
      $date: v.toJSON()
    };
  } else if (v.toJSON) {
    return v.toJSON();
  } else if (_.isObject(v)) {
    return mapObject(v, (key, value) => toJSON(value));
  } else {
    return v;
  }
}

/**
 * Convert object from JSON representation
 *
 * It will descends into array and object to convert Skygear Data Type
 * from JSON representation. If the specified value is null, null is returned.
 *
 * This function is the opposite of toJSON.
 *
 * @param {Object} attrs - the object or value in JSON representation
 * @return {Object} the result in Skygear Data Type
 */
// eslint-disable-next-line complexity
export function fromJSON(attrs) {
  if (attrs === null) {
    return null;
  } else if (attrs === undefined) {
    return undefined;
  } else if (_.isArray(attrs)) {
    return _.map(attrs, fromJSON);
  } else if (_.isObject(attrs)) {
    switch (attrs.$type) {
    case 'date':
      return new Date(attrs.$date);
    default:
      return mapObject(attrs, (key, value) => fromJSON(value));
    }
  } else if (attrs.fromJSON) {
    return attrs.fromJSON();
  } else {
    return attrs;
  }
}

export function isLocalStorageValid() {
  /* global window: false */
  try {
    var testKey = '_skygear_test';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

export class EventHandle {
  constructor(emitter, name, listener) {
    this.emitter = emitter;
    this.name = name;
    this.listener = listener;
  }

  cancel() {
    this.emitter.off(this.name, this.listener);
  }
}
