/**
 * Copyright 2017 Oursky Ltd.
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

/**
 * Login with custom token.
 *
 * The custom token is typically created on an external server hosting a user
 * database. This server generates the custom token so that the user on an
 * external server can log in to Skygear Server.
 *
 * @injectTo {AuthContainer} as loginWithCustomToken
 * @param  {String} token - the token string
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.loginWithCustomToken('eyXXXXXXXX').then(...);
 */
export function loginWithCustomToken(token) {
  return this.container.makeRequest('sso:custom_token:login', {
    token
  }).then(this._authResolve.bind(this));
}
