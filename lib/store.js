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
  'skygear-accesstoken'];
var store;

const PURGEABLE_KEYS_KEY = '_skygear_purgeable_keys_';

import {CookieStorage} from 'cookie-storage';
import {isLocalStorageValid} from './util';

class SyncStorageDriver {

  constructor(syncImpl) {
    this._syncImpl = syncImpl;
  }

  clear(callback) {
    return new Promise(function (resolve) {
      this._syncImpl.clear();
      if (callback) {
        callback(null);
      }
      resolve();
    }.bind(this));
  }

  getItem(key, callback) {
    return new Promise(function (resolve) {
      const value = this._syncImpl.getItem(key);
      if (callback) {
        callback(null, value);
      }
      resolve(value);
    }.bind(this));
  }

  setItem(key, value, callback) {
    return new Promise(function (resolve, reject) {
      try {
        this._syncImpl.setItem(key, value);
        if (callback) {
          callback(null);
        }
        resolve();
      } catch (e) {
        if (callback) {
          callback(e);
        }
        reject(e);
      }
    }.bind(this));
  }

  removeItem(key, callback) {
    return new Promise(function (resolve) {
      this._syncImpl.removeItem(key);
      if (callback) {
        callback(null);
      }
      resolve();
    }.bind(this));
  }

  multiGet(keys, callback) {
    return new Promise(function (resolve) {
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
      resolve(output);
    }.bind(this));
  }

  multiSet(keyValuePairs, callback) {
    return new Promise(function (resolve, reject) {
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
        resolve();
      } catch (e) {
        if (callback) {
          callback(e);
        }
        reject(e);
      }
    }.bind(this));
  }

  multiRemove(keys, callback) {
    return new Promise(function (resolve) {
      for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        this._syncImpl.removeItem(key);
      }
      if (callback) {
        callback(null);
      }
      resolve();
    }.bind(this));
  }

  key(n, callback) {
    return new Promise(function (resolve) {
      const result = this._syncImpl.key(n);
      if (callback) {
        callback(null, result);
      }
      resolve(result);
    }.bind(this));
  }

  keys(callback) {
    return new Promise(function (resolve) {
      const length = this._syncImpl.length;
      const output = [];
      for (let i = 0; i < length; ++i) {
        output.push(this._syncImpl.key(i));
      }
      if (callback) {
        callback(null, output);
      }
      resolve(output);
    }.bind(this));
  }

  length(callback) {
    return new Promise(function (resolve) {
      const length = this._syncImpl.length;
      if (callback) {
        callback(null, length);
      }
      resolve(length);
    }.bind(this));
  }

}

class ReactNativeAsyncStorageDriver {

  constructor(rnImpl) {
    this._rnImpl = rnImpl;
  }

  clear(callback) {
    return this._rnImpl.clear(callback);
  }

  getItem(key, callback) {
    return this._rnImpl.getItem(key, callback);
  }

  setItem(key, value, callback) {
    return this._rnImpl.setItem(key, value, callback);
  }

  removeItem(key, callback) {
    return this._rnImpl.removeItem(key, callback);
  }

  multiGet(keys, callback) {
    return this._rnImpl.multiGet(keys).then(function (rnKeyValuePairs) {
      const output = [];
      for (let i = 0; i < rnKeyValuePairs.length; ++i) {
        const rnPair = rnKeyValuePairs[i];
        const key = rnPair[0];
        const value = rnPair[1];
        output.push({
          key: key,
          value: value
        });
      }
      if (callback) {
        callback(null, output);
      }
      return output;
    }, function (errors) {
      if (callback) {
        callback(errors);
      }
      return Promise.reject(errors);
    });
  }

  multiSet(keyValuePairs, callback) {
    const rnKeyValuePairs = [];
    for (let i = 0; i < keyValuePairs.length; ++i) {
      const pair = keyValuePairs[i];
      const key = pair.key;
      const value = pair.value;
      rnKeyValuePairs.push([key, value]);
    }
    return this._rnImpl.multiSet(rnKeyValuePairs, callback);
  }

  multiRemove(keys, callback) {
    return this._rnImpl.multiRemove(keys, callback);
  }

  key(n, callback) {
    return this._rnImpl.getAllKeys().then(function (allKeys) {
      let result = null;
      if (n >= 0 && n < allKeys.length) {
        result = allKeys[n];
      }
      if (callback) {
        callback(null, result);
      }
      return result;
    });
  }

  keys(callback) {
    return this._rnImpl.getAllKeys(callback);
  }

  length(callback) {
    return this._rnImpl.getAllKeys().then(function (allKeys) {
      if (callback) {
        callback(null, allKeys.length);
      }
      return allKeys.length;
    });
  }

}

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
    return this._driver.setItem(key, value, callback);
  }

  setPurgeableItem(key, value, callback) {
    if (this.keyWhiteList && this.keyWhiteList.indexOf(key) < 0) {
      return Promise.reject(new Error('Saving key is not permitted'));
    }
    const newPurgeableKeys = this._maintainLRUOrder(
      this._purgeableKeys, [key]
    );
    this._purgeableKeys = newPurgeableKeys;

    const keyValuePairs = [
      {
        key: key,
        value: value
      },
      {
        key: PURGEABLE_KEYS_KEY,
        value: JSON.stringify(newPurgeableKeys)
      }
    ];

    return this.multiSetTransactionally(keyValuePairs, callback);
  }

  _selectKeysToPurge(keys) {
    const index = Math.floor(keys.length / 2);
    const keysToPurge = keys.slice(index);
    return keysToPurge;
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

    return this._driver.multiGet(keys).then(function (original) {
      return this._driver.multiSet(keyValuePairs).then(function () {
        if (callback) {
          callback(null);
        }
        return Promise.resolve();
      }, function (e) {
        return this._driver.multiRemove(keys).then(function () {
          return this._driver.multiSet(original).then(function () {
            if (callback) {
              callback(e);
            }
            return Promise.reject(e);
          });
        }.bind(this));
      }.bind(this));
    }.bind(this));
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

/* global window: false */
if (typeof window !== 'undefined') {
  // env: browser-like
  var rn = require('react-native');
  if (rn && rn.AsyncStorage) {
    // env: ReactNative
    store = new Store(new ReactNativeAsyncStorageDriver(rn.AsyncStorage));
  } else if (isLocalStorageValid()) {
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

export default store;
