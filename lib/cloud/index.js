import registry from './registry';
import crypto from 'crypto';

const nameCntMap = {};

function incSuffix(name) {
  if (nameCntMap[name] !== undefined) {
    nameCntMap[name] += 1;
    return name + '-' + nameCntMap[name];
  }
  nameCntMap[name] = 0;
  return name;
}

function funcName(func) {
  let name = func.name;
  if (!name) {
    const hash = crypto.createHash('sha');
    hash.update(func.toString());
    name = hash.digest('hex');
  }
  return incSuffix(name);
}

export function op(name, func, options = {}) {
  registry.registerOp(name, func, options);
}

export function every(cron, func, options = {}) {
  // TODO: check cron format
  options.spec = cron;
  let name = funcName(func);
  registry.registerTimer(name, func, options);
}

export function handler(name, func, options = {}) {
  registry.registerHandler(name, func, options);
}

export function hook(name, func, options = {}) {
  registry.registerHook(name, func, options);
}

export function beforeSave(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'beforeSave';
  registry.registerHook(name, func, options);
}

export function afterSave(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'afterSave';
  registry.registerHook(name, func, options);
}

export function beforeDelete(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'beforeDelete';
  registry.registerHook(name, func, options);
}

export function afterDelete(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'afterDelete';
  registry.registerHook(name, func, options);
}

