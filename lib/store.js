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

import {CookieStorage} from 'cookie-storage';
import {isLocalStorageValid} from './util';

class SyncStorageDriver { // eslint-disable-line

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

class ReactNativeAsyncStorageDriver { // eslint-disable-line

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

if (typeof window !== 'undefined') {
  var localforage = require('localforage');

  var rn = require('react-native');

  if (rn && rn.AsyncStorage) {
    var AsyncStorage = rn.AsyncStorage;
    var ReactNativeDriver = {
      _driver: 'ReactNativeAsyncStorage',
      _support: true,
      _initStorage: function (options) { //eslint-disable-line
        console.log('Init ReactNativeAsyncStorage');
        return;
      },
      clear: function (callback) {
        return AsyncStorage.clear(callback);
      },
      getItem: function (key, callback) {
        return AsyncStorage.getItem(key, callback);
      },
      setItem: function (key, value, callback) {
        return AsyncStorage.setItem(key, value, callback);
      },
      removeItem: function (key, callback) {
        return AsyncStorage.removeItem(key, callback);
      },
      key: function (n, callback) { //eslint-disable-line
        throw Error('Not support key in ReactNativeAsyncStorage');
      },
      keys: function (callback) {
        AsyncStorage.getAllKeys(callback);
      },
      length: function (callback) { //eslint-disable-line
        throw Error('Not support length in ReactNativeAsyncStorage');
      },
      iterate: function(iterator, callback) { //eslint-disable-line
        // localForage doc is incorrect,
        // https://mozilla.github.io/localForage/#config
        throw Error('Not support iterate in ReactNativeAsyncStorage');
      }
    };

    store = ReactNativeDriver;
  } else {
    if (isLocalStorageValid()) {
      store = localforage;
    } else {
      var storage = new CookieStorage();
      store = new Store(storage, cookieKeyWhiteList);
    }
  }
} else {
  var localStorage = require('localstorage-memory');
  store = new Store(localStorage);
}

export default store;
