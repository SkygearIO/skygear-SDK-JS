var store;

if (typeof window !== 'undefined') {
  var localforage = require('localforage');
  var AsyncStorage = false;
  var rn = require('react-native');

  if (rn) {
    AsyncStorage = rn.AsyncStorage;
  }

  var ReactNativeDriver = {
    _driver: 'ReactNativeAsyncStorage',
    _support: AsyncStorage,
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

  // Add the driver to localForage.
  localforage.defineDriver(ReactNativeDriver);

  localforage.config({
    driver: [
      'ReactNativeAsyncStorage',
      localforage.LOCALSTORAGE
    ],
    name: 'skygear'
  });

  store = localforage;
} else {
  var localStorage = require('localStorage');

  store = {
    clear: function (callback) {
      return new Promise(function (resolve) {
        localStorage.clear();
        if (callback) {
          callback();
        }
        resolve();
      });
    },
    getItem: function (key, callback) {
      return new Promise(function (resolve) {
        let value = localStorage.getItem(key);
        if (callback) {
          callback(null, value);
        }
        resolve(value);
      });
    },
    setItem: function (key, value, callback) {
      return new Promise(function (resolve) {
        localStorage.setItem(key, value);
        if (callback) {
          callback(value);
        }
        resolve(value);
      });
    },
    removeItem: function (key, callback) {
      return new Promise(function (resolve) {
        localStorage.removeItem(key);
        if (callback) {
          callback();
        }
        resolve();
      });
    }
  };
}

export default store;
