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
var store;

import {CookieStorage} from 'cookie-storage';
import {isLocalStorageValid} from './util';

class Store {
  constructor(storage) {
    this.storage = storage;
  }

  clear(callback) {
    return new Promise(function (resolve) {
      this.storage.clear();
      if (callback) {
        callback();
      }
      resolve();
    }.bind(this));
  }

  getItem(key, callback) {
    return new Promise(function (resolve) {
      let value = this.storage.getItem(key);
      if (callback) {
        callback(null, value);
      }
      resolve(value);
    }.bind(this));
  }

  setItem(key, value, callback) {
    return new Promise(function (resolve) {
      this.storage.setItem(key, value);
      if (callback) {
        callback(value);
      }
      resolve(value);
    }.bind(this));
  }

  removeItem(key, callback) {
    return new Promise(function (resolve) {
      this.storage.removeItem(key);
      if (callback) {
        callback();
      }
      resolve();
    }.bind(this));
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
      store = new Store(storage);
    }
  }
} else {
  var localStorage = require('localStorage');
  store = new Store(localStorage);
}

export default store;
