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

  clear(callback) {
    this._syncImpl.clear();
    if (callback) {
      callback(null);
    }
    return Promise.resolve();
  }

  getItem(key, callback) {
    const value = this._syncImpl.getItem(key);
    if (callback) {
      callback(null, value);
    }
    return Promise.resolve(value);
  }

  setItem(key, value, callback) {
    try {
      this._syncImpl.setItem(key, value);
      if (callback) {
        callback(null);
      }
      return Promise.resolve();
    } catch (e) {
      if (callback) {
        callback(e);
      }
      return Promise.reject(e);
    }
  }

  removeItem(key, callback) {
    this._syncImpl.removeItem(key);
    if (callback) {
      callback(null);
    }
    return Promise.resolve();
  }

  multiGet(keys, callback) {
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
    return Promise.resolve(output);
  }

  multiSet(keyValuePairs, callback) {
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
      return Promise.resolve();
    } catch (e) {
      if (callback) {
        return Promise.callback(e);
      }
      return Promise.reject(e);
    }
  }

  multiRemove(keys, callback) {
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      this._syncImpl.removeItem(key);
    }
    if (callback) {
      callback(null);
    }
    return Promise.resolve();
  }

  key(n, callback) {
    const result = this._syncImpl.key(n);
    if (callback) {
      callback(null, result);
    }
    return Promise.resolve(result);
  }

  keys(callback) {
    const length = this._syncImpl.length;
    const output = [];
    for (let i = 0; i < length; ++i) {
      output.push(this._syncImpl.key(i));
    }
    if (callback) {
      callback(null, output);
    }
    return Promise.resolve(output);
  }

  length(callback) {
    const length = this._syncImpl.length;
    if (callback) {
      callback(null, length);
    }
    return Promise.resolve(length);
  }

}

/**
 * @private
 */
class Store {
  constructor(driver, keyWhiteList) {
    this._driver = driver;
    this.keyWhiteList = keyWhiteList;
    this._purgeableKeys = [];

    this._driver.getItem(PURGEABLE_KEYS_KEY).then(function (value) {
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
    }.bind(this));
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

  clear(callback) {
    return this._driver.clear(callback);
  }

  getItem(key, callback) {
    return this._driver.getItem(key, callback);
  }

  setItem(key, value, callback) {
    if (this.keyWhiteList && this.keyWhiteList.indexOf(key) < 0) {
      return Promise.reject(new Error('Saving key is not permitted'));
    }
    return this._driver.setItem(key, value).then(() => {
      if (callback) {
        callback(null);
      }
      return Promise.resolve();
    }, (error) =>
      this._purge().then(() => Promise.reject(error))
    )
    .catch((error) => {
      if (callback) {
        callback(error);
      }
      return Promise.reject(error);
    });
  }

  setPurgeableItem(key, value, callback) {
    if (this.keyWhiteList && this.keyWhiteList.indexOf(key) < 0) {
      return Promise.reject(new Error('Saving key is not permitted'));
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
    return this.multiSetTransactionally(keyValuePairs).then(() => {
      if (callback) {
        callback(null);
      }
      return Promise.resolve();
    }, (error) =>
      this._purge().then(() => Promise.reject(error))
    )
    .catch((error) => {
      if (callback) {
        callback(error);
      }
      return Promise.reject(error);
    });
  }

  _selectKeysToPurge(keys) {
    const index = Math.floor(keys.length / 2);
    const keysToPurge = keys.slice(index);
    return keysToPurge;
  }

  _purge() {
    const keysToPurge = this._selectKeysToPurge(this._purgeableKeys);
    if (keysToPurge.length <= 0) {
      return Promise.reject(new Error('no more keys to purge'));
    }

    this._purgeableKeys = this._removeKeysInLRUOrder(
      this._purgeableKeys,
      keysToPurge
    );
    return this._driver.multiRemove(keysToPurge).then(function () {
      return this._driver.setItem(
        PURGEABLE_KEYS_KEY,
        JSON.stringify(this._purgeableKeys)
      );
    }.bind(this));
  }

  multiSetTransactionally(keyValuePairs, callback) {
    const keys = [];
    for (let i = 0; i < keyValuePairs.length; ++i) {
      const pair = keyValuePairs[i];
      const key = pair.key;
      if (this.keyWhiteList && this.keyWhiteList.indexOf(key) < 0) {
        return Promise.reject(new Error('Saving key is not permitted'));
      }
      keys.push(key);
    }

    return this._driver.multiGet(keys).then((original) => {
      return this._driver.multiSet(keyValuePairs).then(() => {
        if (callback) {
          callback(null);
        }
        return Promise.resolve();
      }, (e) => {
        return this._driver.multiRemove(keys).then(() => {
          return this._driver.multiSet(original).then(() => {
            if (callback) {
              callback(e);
            }
            return Promise.reject(e);
          });
        });
      });
    });
  }

  clearPurgeableItems(callback) {
    const keys = this._purgeableKeys.slice();
    this._purgeableKeys = [];
    return this._driver.multiRemove(keys, callback);
  }

  removeItem(key, callback) {
    return this._driver.removeItem(key, callback);
  }

  key(n, callback) {
    return this._driver.key(n, callback);
  }

  keys(callback) {
    return this._driver.keys(callback);
  }

  length(callback) {
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
