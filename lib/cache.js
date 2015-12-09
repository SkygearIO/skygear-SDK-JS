import store from './store';

export default class Cache {

  constructor(prefix) {
    this.prefix = prefix;
    this.map = {};
  }

  _key(key) {
    return this.prefix + ':' + key;
  }

  set(key, value) {
    const prefixKey = this._key(key);
    return new Promise(function (resolve) {
      this.map[prefixKey] = value;
      store.setItem(prefixKey, JSON.stringify(value));
      resolve();
    }.bind(this));
  }

  get(key) {
    const prefixKey = this._key(key);
    return new Promise(function (resolve, reject) {
      const result = this.map[prefixKey];
      if (result) {
        resolve(result);
      } else {
        store.getItem(prefixKey).then(function (jsonStr) {
          if (jsonStr) {
            let cachedJSON = JSON.parse(jsonStr);
            resolve(cachedJSON);
          } else {
            reject();
          }
        }, function (err) {
          reject(err);
        });

      }
    }.bind(this));
  }
}
