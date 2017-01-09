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

export const settings = {
  skygearAddress: process.env.SKYGEAR_ADDRESS || 'tcp://127.0.0.1:6666',
  skygearEndpoint: process.env.SKYGEAR_ENDPOINT || 'http://127.0.0.1:3000',
  apiKey: process.env.API_KEY || null,
  masterKey: process.env.MASTER_KEY || null,
  appName: process.env.APP_NAME || '',
  logLevel: process.env.LOG_LEVEL || 'INFO',
  http: loadHttpSettings(),
  debug: process.env.DEBUG || false,
  pubsubURL: process.env.PUBSUB_URL || 'ws://127.0.0.0.1:3000/',
  serveStaticAssets: process.env.SERVE_STATIC_ASSETS || true,
  collectAsset: process.env.COLLECT_ASSET || '/usr/src/assets',
  forceAsset: process.env.FORCE_ASSET || false,
  databaseURL: process.env.DATABASE_URL ||
    'postgres://postgres@db/postgres?sslmode=disable',
  loadModules: loadModuleSettings()
};
