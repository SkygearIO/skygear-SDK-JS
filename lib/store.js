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
      AsyncStorage.clear(callback);
    },
    getItem: function (key, callback) {
      AsyncStorage.getItem(key, callback);
    },
    setItem: function (key, value, callback) {
      AsyncStorage.setItem(key, value, callback);
    },
    removeItem: function (key, callback) {
      AsyncStorage.removeItem(key, callback);
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
    iterate: function(iterator, callback) {
      // localForage doc is incorrect, https://mozilla.github.io/localForage/#config
      throw Error('Not support iterate in ReactNativeAsyncStorage');
    },
  };

  // Add the driver to localForage.
  localforage.defineDriver(ReactNativeDriver);

  localforage.config({
    driver: [
      'ReactNativeAsyncStorage',
      localforage.LOCALSTORAGE
    ],
    name: 'ourd'
  });

  store = localforage;
} else {
  var localStorage = require('localStorage');

  store = {
    clear: function (callback) {
      localStorage.clear();
      callback();
    },
    getItem: function (key, callback) {
      callback(null, localStorage.getItem(key));
    },
    setItem: function (key, value, callback) {
      localStorage.setItem(key, value);
      callback(value);
    },
    removeItem: function (key, callback) {
      localStorage.removeItem(key);
      callback();
    }
  };
}

export default store;
