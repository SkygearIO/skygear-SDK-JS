import reactNative from 'react-native';
import { Store } from '../store';

class ReactNativeAsyncStorageDriver {

  constructor(rnImpl) {
    this._rnImpl = rnImpl;
  }

  async clear(callback) {
    return this._rnImpl.clear(callback);
  }

  async getItem(key, callback) {
    return this._rnImpl.getItem(key, callback);
  }

  async setItem(key, value, callback) {
    return this._rnImpl.setItem(key, value, callback);
  }

  async removeItem(key, callback) {
    return this._rnImpl.removeItem(key, callback);
  }

  async multiGet(keys, callback) {
    try {
      const rnKeyValuePairs = await this._rnImpl.multiGet(keys);
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
    } catch (errors) {
      if (callback) {
        callback(errors);
      }
      throw errors;
    }
  }

  async multiSet(keyValuePairs, callback) {
    const rnKeyValuePairs = [];
    for (let i = 0; i < keyValuePairs.length; ++i) {
      const pair = keyValuePairs[i];
      const key = pair.key;
      const value = pair.value;
      rnKeyValuePairs.push([key, value]);
    }
    return this._rnImpl.multiSet(rnKeyValuePairs, callback);
  }

  async multiRemove(keys, callback) {
    return this._rnImpl.multiRemove(keys, callback);
  }

  async key(n, callback) {
    const allKeys = await this._rnImpl.getAllKeys();
    let result = null;
    if (n >= 0 && n < allKeys.length) {
      result = allKeys[n];
    }
    if (callback) {
      callback(null, result);
    }
    return result;
  }

  async keys(callback) {
    return this._rnImpl.getAllKeys(callback);
  }

  async length(callback) {
    const allKeys = await this._rnImpl.getAllKeys();
    if (callback) {
      callback(null, allKeys.length);
    }
    return allKeys.length;
  }
}

export default new Store(
  new ReactNativeAsyncStorageDriver(reactNative.AsyncStorage)
);
