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
const cookieKeyWhiteList = [
  'skygear-deviceid',
  'skygear-user',
  'skygear-accesstoken',
  'skygear-oauth-redirect-action'
];
var store;

const PURGEABLE_KEYS_KEY = '_skygear_purgeable_keys_';

import {CookieStorage} from 'cookie-storage';
import {isLocalStorageValid} from './util';

/**
 * @private
 */
class SyncStorageDriver {

  constructor(syncImpl) {
    this._syncImpl = syncImpl;
  }

  async clear(callback) {
    this._syncImpl.clear();
    if (callback) {
      callback(null);
    }
  }

  async getItem(key, callback) {
    const value = this._syncImpl.getItem(key);
    if (callback) {
      callback(null, value);
    }
    return value;
  }

  async setItem(key, value, callback) {
    try {
      this._syncImpl.setItem(key, value);
      if (callback) {
        callback(null);
      }
    } catch (e) {
      if (callback) {
        callback(e);
      }
      throw e;
    }
  }

  async removeItem(key, callback) {
    this._syncImpl.removeItem(key);
    if (callback) {
      callback(null);
    }
  }

  async multiGet(keys, callback) {
    const output = [];
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      const value = this._syncImpl.getItem(key);
      output.push({
        key: key,
        value: value
      });
    }
    if (callback) {
      callback(null, output);
    }
    return output;
  }

  async multiSet(keyValuePairs, callback) {
    try {
      for (let i = 0; i < keyValuePairs.length; ++i) {
        const pair = keyValuePairs[i];
        const key = pair.key;
        const value = pair.value;
        this._syncImpl.setItem(key, value);
      }
      if (callback) {
        callback(null);
      }
    } catch (e) {
      if (callback) {
        return callback(e);
      }
      throw e;
    }
  }

  async multiRemove(keys, callback) {
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      this._syncImpl.removeItem(key);
    }
    if (callback) {
      callback(null);
    }
  }

  async key(n, callback) {
    const result = this._syncImpl.key(n);
    if (callback) {
      callback(null, result);
    }
    return result;
  }

  async keys(callback) {
    const length = this._syncImpl.length;
    const output = [];
    for (let i = 0; i < length; ++i) {
      output.push(this._syncImpl.key(i));
    }
    if (callback) {
      callback(null, output);
    }
    return output;
  }

  async length(callback) {
    const length = this._syncImpl.length;
    if (callback) {
      callback(null, length);
    }
    return length;
  }
}

/**
 * @private
 */
export class Store {
  constructor(driver, keyWhiteList) {
    this._driver = driver;
    this.keyWhiteList = keyWhiteList;
    this._purgeableKeys = [];

    (async () => {
      const value = await this._driver.getItem(PURGEABLE_KEYS_KEY);
      if (value) {
        try {
          const originalKeys = JSON.parse(value);
          const recentKeys = this._purgeableKeys;

          this._purgeableKeys = this._maintainLRUOrder(
            originalKeys,
            recentKeys
          );
        } catch (e) {
          // ignore
        }
      }
    })();
  }

  /*
   * @param originalKeys
   * @param recentKeys
   * @return newKeys with recentKeys come first, followed by deduped
   *         originalKeys
   */
  _maintainLRUOrder(originalKeys, recentKeys) {
    const mapping = {};
    for (let i = 0; i < recentKeys.length; ++i) {
      mapping[recentKeys[i]] = true;
    }

    const output = recentKeys.slice();
    for (let i = 0; i < originalKeys.length; ++i) {
      if (mapping[originalKeys[i]]) {
        continue;
      }
      output.push(originalKeys[i]);
    }
    return output;
  }

  /*
   * @param originalKeys
   * @param keysToRemove
   * @return newKeys without value contained in keysToRemove
   */
  _removeKeysInLRUOrder(originalKeys, keysToRemove) {
    const mapping = {};
    for (let i = 0; i < keysToRemove.length; ++i) {
      mapping[keysToRemove[i]] = true;
    }

    const output = [];
    for (let i = 0; i < originalKeys.length; ++i) {
      if (mapping[originalKeys[i]]) {
        continue;
      }
      output.push(originalKeys[i]);
    }
    return output;
  }

  async clear(callback) {
    return this._driver.clear(callback);
  }

  async getItem(key, callback) {
    return this._driver.getItem(key, callback);
  }

  async setItem(key, value, callback) {
    if (this.keyWhiteList && this.keyWhiteList.indexOf(key) < 0) {
      throw new Error('Saving key is not permitted');
    }

    try {
      await this._driver.setItem(key, value);
      if (callback) {
        callback(null);
      }
    } catch (error) {
      let lastError = error;
      try {
        await this._purge();
      } catch (innerError) {
        lastError = innerError;
      }

      if (callback) {
        callback(lastError);
      }
      throw lastError;
    }
  }

  async setPurgeableItem(key, value, callback) {
    if (this.keyWhiteList && this.keyWhiteList.indexOf(key) < 0) {
      throw new Error('Saving key is not permitted');
    }
    this._purgeableKeys = this._maintainLRUOrder(
      this._purgeableKeys, [key]
    );

    const keyValuePairs = [
      {
        key: key,
        value: value
      },
      {
        key: PURGEABLE_KEYS_KEY,
        value: JSON.stringify(this._purgeableKeys)
      }
    ];

    try {
      await this.multiSetTransactionally(keyValuePairs);
      if (callback) {
        callback(null);
      }
    } catch (error) {
      let lastError = error;
      try {
        await this._purge();
      } catch (innerError) {
        lastError = innerError;
      }

      if (callback) {
        callback(lastError);
      }
      throw lastError;
    }
  }

  _selectKeysToPurge(keys) {
    const index = Math.floor(keys.length / 2);
    const keysToPurge = keys.slice(index);
    return keysToPurge;
  }

  async _purge() {
    const keysToPurge = this._selectKeysToPurge(this._purgeableKeys);
    if (keysToPurge.length <= 0) {
      throw new Error('no more keys to purge');
    }

    this._purgeableKeys = this._removeKeysInLRUOrder(
      this._purgeableKeys,
      keysToPurge
    );
    await this._driver.multiRemove(keysToPurge);
    return this._driver.setItem(
      PURGEABLE_KEYS_KEY,
      JSON.stringify(this._purgeableKeys)
    );
  }

  async multiSetTransactionally(keyValuePairs, callback) {
    const keys = [];
    for (let i = 0; i < keyValuePairs.length; ++i) {
      const pair = keyValuePairs[i];
      const key = pair.key;
      if (this.keyWhiteList && this.keyWhiteList.indexOf(key) < 0) {
        throw new Error('Saving key is not permitted');
      }
      keys.push(key);
    }
    const original = await this._driver.multiGet(keys);
    try {
      await this._driver.multiSet(keyValuePairs);
      if (callback) {
        callback(null);
      }
      return;
    } catch (e) {
      await this._driver.multiRemove(keys);
      await this._driver.multiSet(original);
      if (callback) {
        callback(e);
      }
      throw e;
    }
  }

  async clearPurgeableItems(callback) {
    const keys = this._purgeableKeys.slice();
    this._purgeableKeys = [];
    return this._driver.multiRemove(keys, callback);
  }

  async removeItem(key, callback) {
    return this._driver.removeItem(key, callback);
  }

  async key(n, callback) {
    return this._driver.key(n, callback);
  }

  async keys(callback) {
    return this._driver.keys(callback);
  }

  async length(callback) {
    return this._driver.length(callback);
  }

}

/**
 * @private
 */
export const setStore = (_store) => {
  store = _store;
};

/**
 * @private
 */
export default () => {
  if (store) {
    return store;
  }
  /* global window: false */
  if (typeof window !== 'undefined') {
    // env: browser-like
    if (isLocalStorageValid()) {
      // env: Modern browsers
      store = new Store(new SyncStorageDriver(window.localStorage));
    } else {
      // env: Legacy browsers
      var cookieImpl = new CookieStorage();
      store = new Store(new SyncStorageDriver(cookieImpl, cookieKeyWhiteList));
    }
  } else {
    // env: node
    var memoryImpl = require('localstorage-memory');
    store = new Store(new SyncStorageDriver(memoryImpl));
  }
  return store;
};
