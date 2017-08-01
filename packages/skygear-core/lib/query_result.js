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

export default class QueryResult extends Array {
  /**
   * Creates an QueryResult from records and info, including query overall
   * count.
   *
   * @param {Record[]} records
   * @param {Object} info
   * @return {QueryResult}
   */
  static createFromResult(records, info) {
    let result = new QueryResult();
    records.forEach((val) => result.push(val));
    result._overallCount = info ? info.count : undefined;
    return result;
  }

  /**
   * The count would return the number of all matching records, and ignore the
   * offset and limit of the query.
   *
   * @type {Number} the number of all matching records
   */
  get overallCount() {
    return this._overallCount;
  }
}
