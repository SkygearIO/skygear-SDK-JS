import reactNative from 'react-native';
import { Store } from '../store';

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

export default new Store(
  new ReactNativeAsyncStorageDriver(reactNative.AsyncStorage)
);
