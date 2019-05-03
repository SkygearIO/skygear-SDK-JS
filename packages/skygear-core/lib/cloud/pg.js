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
import pg from 'pg';

import { settings } from './settings';
import { createLogger } from './logging';
import { databaseConfigFromURL } from './pgurl';

const config = databaseConfigFromURL(settings.databaseURL);
config.min = settings.pgPoolMin;
config.max = settings.pgPoolMax;
config.idleTimeoutMillis = settings.pgPoolIdleTimeoutMillis;

/**
 * Database connection pool of the Skygear PostgreSQL database. The
 * database connection is automatically configured by environment variable
 * and is ready to make connection by calling the `connect` function. See
 * node-postgres documentation for usage.
 *
 * @see https://github.com/brianc/node-postgres/wiki
 */
export const pool = new pg.Pool(config);

/**
 * Connect to a pg connection provided by pg pool.
 *
 * The pg connection is automatically set to use the application's database
 * schema.
 *
 * @param {function(err:*, client: *, done: function): *} callback - function
 * called after setting up the database connection
 *
 * @example
 * const skygearCloud = require('skygear/cloud');
 * skygearCloud.poolConnect(function (err, client, done) {
 *   // if err is undefined or null, make query using the client
 *   client.query(
 *     'SELECT id FROM _user WHERE username = $1',
 *     ['johndoe'],
 *     function(queryErr, result) {
 *       done();
 *       // use the query result here
 *     }
 *   );
 * }
 */
export function poolConnect(callback) {
  const logger = createLogger('plugin').child({tag: 'plugin'});
  pool.connect(function (err, client, done) {
    if (err !== null && err !== undefined) {
      logger.error({err: err}, 'Unable to connect to pg pool %s', err);
      callback(err, client, done);
      return;
    }

    const schemaName = `app_${settings.appName}`;
    const stmt = `SET search_path TO ${schemaName},public;`;
    client.query(stmt, function (queryErr) {
      if (queryErr !== null && queryErr !== undefined) {
        logger.error(
          {err: queryErr},
          `Unable to select "${schemaName}" schema: %s`,
          queryErr
        );
        callback(queryErr, client, done);
        return;
      }

      callback(null, client, done);
    });
  });
}
