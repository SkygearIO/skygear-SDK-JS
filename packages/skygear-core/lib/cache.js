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

/**
 * @private
 */
export default class Cache {

  constructor(prefix, store) {
    this._maxRetryCount = 1;
    this.prefix = prefix;
    this.map = {};
    this.store = store;
  }

  _applyNamespaceOnKey(key) {
    return this.prefix + ':' + key;
  }

  set(key, value) {
    const namespacedKey = this._applyNamespaceOnKey(key);
    this.map[namespacedKey] = value;
    const stringifiedValue = JSON.stringify(value);
    return this._setWithRetry(namespacedKey, stringifiedValue);
  }

  _setWithRetry(namespacedKey, stringifiedValue, attempt = 0) {
    return this.store.setPurgeableItem(namespacedKey, stringifiedValue)
      .catch((error) => {
        // base case
        if (attempt >= this._maxRetryCount) {
          return Promise.reject(error);
        }
        // recursive case
        // It seems that there is no easy way to
        // convert an asynchronous recursion into
        // iterative style with for-loop.
        return this._setWithRetry(
          namespacedKey,
          stringifiedValue,
          attempt + 1
        );
      });
  }

  get(key) {
    const namespacedKey = this._applyNamespaceOnKey(key);
    if (this.map[namespacedKey]) {
      return Promise.resolve(this.map[namespacedKey]);
    }
    return this.store.getItem(namespacedKey).then(function (jsonStr) {
      if (jsonStr) {
        let cachedJSON = JSON.parse(jsonStr);
        return cachedJSON;
      }
      return Promise.reject();
    });
  }
}
