import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import {SkygearResponse} from './transport/common';
import registry from './registry';

/**
 * staticAssetHandler — default handler for serving static assets with during
 * development.
 *
 * @param {string} recordType - The type of the record.
 * @param {function(record: lib/record.js~Record, originalRecord: lib/record.js~Record, pool: pool): *} func - function to be registered.
 * @param {object} [options] - options for hook: async
 */

export function staticAssetHandler(req) {
  if (req.path.indexOf('/static') !== 0) {
    throw new Error('The base path is not static asset');
  }
  let matchedPrefix = null;
  Object.keys(registry.staticAsset).forEach((prefix) => {
    if (req.path.indexOf('/static' + prefix) === 0) {
      matchedPrefix = prefix;
    }
  });
  if (!matchedPrefix) {
    return new SkygearResponse({
      statusCode: 404
    });
  }
  const matchedFunc = registry.staticAsset[matchedPrefix];
  const absPrefix = matchedFunc();
  const finalPath = req.path.replace('/static' + matchedPrefix, absPrefix);
  if (!fs.existsSync(finalPath)) {
    return new SkygearResponse({
      statusCode: 404
    });
  }
  const data = fs.readFileSync(finalPath, {
    flag: 'r'
  });
  const contentType = mime.contentType(path.extname(finalPath));
  return new SkygearResponse({
    headers: {
      'Content-Type': [contentType]
    },
    body: data
  });
}
