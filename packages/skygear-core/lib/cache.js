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

  async set(key, value) {
    const namespacedKey = this._applyNamespaceOnKey(key);
    this.map[namespacedKey] = value;
    const stringifiedValue = JSON.stringify(value);
    return this._setWithRetry(namespacedKey, stringifiedValue);
  }

  async _setWithRetry(namespacedKey, stringifiedValue, attempt = 0) {
    try {
      await this.store.setPurgeableItem(namespacedKey, stringifiedValue);
    } catch (error) {
      // base case
      if (attempt >= this._maxRetryCount) {
        throw error;
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
    }
  }

  async get(key) {
    const namespacedKey = this._applyNamespaceOnKey(key);
    if (this.map[namespacedKey]) {
      return this.map[namespacedKey];
    }
    const jsonStr = await this.store.getItem(namespacedKey);
    if (jsonStr) {
      let cachedJSON = JSON.parse(jsonStr);
      return cachedJSON;
    }
    throw Error(`key ${key} not found in store`);
  }
}
