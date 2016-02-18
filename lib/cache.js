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
import store from './store';

export default class Cache {

  constructor(prefix) {
    this.prefix = prefix;
    this._keyStore = this.prefix + ':keys';
    this.map = {};
    this.keys = [];
    this.store = store;
    this.store.getItem(this._keyStore).then(function (jsonStr) {
      const ary = JSON.parse(jsonStr);
      this.keys = _.union(this.keys, ary);
    }.bind(this), function (err) {
      console.warn('Failed to get cached keys', this.prefix, err);
    }.bind(this));
  }

  _key(key) {
    return this.prefix + ':' + key;
  }

  set(key, value) {
    const prefixKey = this._key(key);
    return new Promise(function (resolve) {
      this.map[prefixKey] = value;
      this.keys = _.union(this.keys, [prefixKey]);
      this.store.setItem(this._keyStore, JSON.stringify(this.keys));
      this.store.setItem(prefixKey, JSON.stringify(value));
      resolve();
    }.bind(this));
  }

  get(key) {
    const prefixKey = this._key(key);
    return new Promise(function (resolve, reject) {
      const result = this.map[prefixKey];
      if (result) {
        resolve(result);
      } else {
        this.store.getItem(prefixKey).then(function (jsonStr) {
          if (jsonStr) {
            let cachedJSON = JSON.parse(jsonStr);
            resolve(cachedJSON);
          } else {
            reject();
          }
        }, function (err) {
          reject(err);
        });
      }
    }.bind(this));
  }

  reset() {
    const _store = this.store;
    const removal = _.map(this.keys, function (key) {
      return _store.removeItem(key);
    });
    this.keys = [];
    removal.push(this.store.setItem(this._keyStore, JSON.stringify(this.keys)));
    return Promise.all(removal);
  }
}
