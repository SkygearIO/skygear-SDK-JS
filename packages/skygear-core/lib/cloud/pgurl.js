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
import { parse } from 'url';

export function databaseConfigFromURL(databaseURL) {
  // https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
  // The documentation says all parts of the URL are optional,
  // so we must assume them being optional.
  const { auth, hostname, port, pathname, query } = parse(databaseURL, true);

  const config = {};
  if (hostname) {
    config.host = hostname;
  }
  if (port) {
    config.port = parseInt(port, 10);
  }
  if (pathname) {
    const database = pathname.split('/')[1];
    if (database) {
      config.database = database;
    }
  }
  config.ssl = query && query.sslmode !== 'disable';
  if (auth) {
    const [username, password] = auth.split(':');
    if (username) {
      config.user = username;
    }
    if (password !== null && password !== undefined) {
      config.password = password;
    }
  }

  return config;
}
