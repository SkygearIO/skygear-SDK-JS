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
import Asset from './asset';
import Reference from './reference';
import Geolocation from './geolocation';

export function toJSON(v) {
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
    return _.chain(v)
      .map((value, key) => {
        return [key, toJSON(value)];
      })
      .object()
      .value();
  } else {
    return v;
  }
}

export function fromJSON(attrs) {
  if (!_.isObject(attrs)) {
    return attrs;
  }

  switch (attrs.$type) {
  case 'geo':
    return Geolocation.fromJSON(attrs);
  case 'asset':
    return Asset.fromJSON(attrs);
  case 'date':
    return new Date(attrs.$date);
  case 'ref':
    return new Reference(attrs);
  default:
    return attrs;
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
