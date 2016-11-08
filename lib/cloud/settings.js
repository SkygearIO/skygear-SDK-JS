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
export const settings = {
  skygearAddress: process.env.SKYGEAR_ADDRESS || 'tcp://127.0.0.1:6666',
  skygearEndpoint: process.env.SKYGEAR_ENDPOINT || 'http://127.0.0.1:3000',
  apiKey: process.env.API_KEY || null,
  masterKey: process.env.MASTER_KEY || null,
  appName: process.env.APP_NAME || '',
  logLevel: process.env.LOG_LEVEL || 'INFO',
  http: process.env.HTTP || true,
  httpAddr: process.env.HTTP_ADDR || '0.0.0.0:9000',
  debug: process.env.DEBUG || false,
  pubsubURL: process.env.PUBSUB_URL || 'ws://127.0.0.0.1:3000/',
  serveStaticAssets: process.env.SERVE_STATIC_ASSETS || true
};
