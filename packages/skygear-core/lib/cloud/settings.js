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
import dotenv from 'dotenv';

dotenv.config();

function loadHttpSettings() {
  // TODO: set the default value to false when other transport is supported
  const enabled = process.env.HTTP || true;
  const httpAddr = process.env.HTTP_ADDR || '0.0.0.0:9000';


  let addrComponents = httpAddr.split(':', 2);
  if (addrComponents.length < 2) {
    addrComponents.unshift('0.0.0.0');
  }

  const address = addrComponents[0] ? addrComponents[0] : '0.0.0.0';
  const port = parseInt(addrComponents[1]);

  return {
    enabled,
    address,
    port
  };
}

function loadModuleSettings() {
  const modulesList = process.env.LOAD_MODULES || '';

  if (modulesList === '') {
    return [];
  }

  var modules = [];
  if (modulesList.indexOf(':') >= 0) {
    modules = modulesList.split(':');
  } else if (modulesList.indexOf(',') >= 0) {
    modules = modulesList.split(',');
  } else {
    modules = modulesList.split(' ');
  }

  var loadingModules = [];
  modules.forEach(function (moduleName) {
    if (moduleName.indexOf('~') === -1) {
      loadingModules.push(moduleName);
    } else if (moduleName.substring(moduleName.length - 3) === '~js') {
      loadingModules.push(moduleName.substring(0, moduleName.length - 3));
    }
  });

  return loadingModules;
}

function parseBool(val, defaultValue) {
  if (val === '' || val === null || val === undefined) {
    return defaultValue;
  }
  if (typeof val === 'string') {
    var lowerCase = val.toLowerCase().trim();
    return lowerCase !== 'false' && lowerCase !== 'no' && lowerCase !== '0';
  }
  return val !== 0 && val !== false;
}

export function parseInteger(val, defaultValue) {
  if (val === '' || val === null || val === undefined) {
    return defaultValue;
  }
  let i = parseInt(val, 10);
  if (i || i === 0) {
    return i;
  }
  return defaultValue;
}

export const settings = {
  skygearAddress: process.env.SKYGEAR_ADDRESS || 'tcp://127.0.0.1:6666',
  skygearEndpoint: process.env.SKYGEAR_ENDPOINT || 'http://127.0.0.1:3000',
  apiKey: process.env.API_KEY || null,
  masterKey: process.env.MASTER_KEY || null,
  appName: process.env.APP_NAME || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  logFormat: process.env.LOG_FORMAT || 'text',
  http: loadHttpSettings(),
  debug: parseBool(process.env.DEBUG, false),
  pubsubURL: process.env.PUBSUB_URL || 'ws://127.0.0.0.1:3000/',
  serveStaticAssets: parseBool(process.env.SERVE_STATIC_ASSETS, true),
  collectAsset: process.env.COLLECT_ASSET || '/usr/src/assets',
  forceAsset: parseBool(process.env.FORCE_ASSET, false),
  databaseURL: process.env.DATABASE_URL ||
    'postgres://postgres@db/postgres?sslmode=disable',
  pgPoolMax: parseInteger(process.env.PG_POOL_MAX, 10),
  pgPoolMin: parseInteger(process.env.PG_POOL_MIN, 0),
  pgPoolIdleTimeoutMillis:
    parseInteger(process.env.PG_POOL_IDLE_TIMEOUT_MILLIS, 3000),

  assetStore: process.env.ASSET_STORE || 'fs',

  // FS asset settings
  assetStoreSecret: process.env.ASSET_STORE_SECRET || 'asset-secret',
  assetStoreURLPrefix: process.env.ASSET_STORE_URL_PREFIX ||
    'http://127.0.0.1:3000/files',
  assetStoreURLExpireDuration:
    parseInteger(process.env.ASSET_STORE_URL_EXPIRE_DURATION, 3600),

  // S3 asset settings
  assetStoreS3AccessKey: process.env.ASSET_STORE_ACCESS_KEY || '',
  assetStoreS3SecretKey: process.env.ASSET_STORE_SECRET_KEY || 'asset-secret',
  assetStoreS3Bucket: process.env.ASSET_STORE_BUCKET || 'bucket-name',
  assetStoreS3Region: process.env.ASSET_STORE_REGION || 'us-east-1',
  assetStoreS3URLPrefix: process.env.ASSET_STORE_S3_URL_PREFIX,

  // Cloud asset settings
  cloudAssetHost: process.env.CLOUD_ASSET_HOST,
  cloudAssetToken: process.env.CLOUD_ASSET_TOKEN,
  cloudAssetStorePublic: process.env.ASSET_STORE_PUBLIC,
  cloudAssetPublicPrefix: process.env.CLOUD_ASSET_PUBLIC_PREFIX,
  cloudAssetPrivatePrefix: process.env.CLOUD_ASSET_PRIVATE_PREFIX,

  loadModules: loadModuleSettings()
};
