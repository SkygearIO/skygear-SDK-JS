import Store from './store';

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
    return new Promise(function (resolve, reject) {
      this.map[prefixKey] = value;
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
        reject()
      }
    }.bind(this));
  }
}
