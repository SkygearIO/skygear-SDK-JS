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
import {atob} from 'Base64';
import Blob from 'w3c-blob';

/**
 * Asset
 *
 * A model representing a file reference in Skygear record.
 */
export default class Asset {

  /**
   * Constructs a new Asset object. Either file, url or base64 must be
   * provided.
   *
   * @param {Object} attrs
   * @param {String} attrs.name - asset name
   * @param {File|Blob|Buffer} [attrs.file] - file or buffer object
   * @param {String} [attrs.base64] - base64 encoded file content
   * @param {String} [attrs.contentType] - mime of the file
   * @param {String} [attrs.url] - url of the file on Skygear server
   */
  constructor(attrs) {
    attrs = attrs || {};

    let name = attrs.name;
    let file = attrs.file;
    let contentType = attrs.contentType;
    let url = attrs.url;
    let base64 = attrs.base64;

    if (!name) {
      throw new Error('Name should not be empty');
    }
    if (file) {
      if (!contentType && file.type) {
        contentType = file.type;
      }
      if (!contentType) {
        throw new Error('ContentType cannot be inferred from file, ' +
          'please provide a content type manually');
      }
    } else if (base64) {
      if (typeof window === 'undefined') {
        // env: node
        file = Buffer.from(base64, 'base64');
      } else {
        file = base64StringtoBlob(base64);
      }
    }

    /**
     * Asset name
     *
     * @type {String}
     */
    this.name = name;

    /**
     * File object
     *
     * @type {File|Blob}
     */
    this.file = file;

    /**
     * Mime of the file
     *
     * @type {String}
     */
    this.contentType = contentType;

    /**
     * Url of the file on Skygear server
     *
     * @type {String}
     */
    this.url = url;
  }

  /**
   * Serializes Asset to a JSON object.
   *
   * @return {Object} the JSON object
   */
  toJSON() {
    return {
      $type: 'asset',
      $name: this.name,
      $url: this.url
    };
  }

  /**
   * Constructs a new Asset object from JSON object.
   *
   * @param {Object} attrs - the JSON object
   * @param {String} attrs.$name - asset name
   * @param {String} attrs.$url - url of the file on Skygear server
   * @param {String} attrs.$content_type - mime of the file
   * @return {Asset} the created Asset object
   */
  static fromJSON(attrs) {
    return new Asset({
      name: attrs.$name,
      url: attrs.$url,
      contentType: attrs.$content_type
    });
  }

}

// adapted from https://gist.github.com/fupslot/5015897
function base64StringtoBlob(base64) {
  var byteString = atob(base64);

  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  var bb = new Blob([ab]);
  return bb;
}

/**
 * Returns whether an object is a Skygear Asset.
 *
 * @return {Boolean} true if the specified object is a Skygear Asset.
 */
export function isAsset(obj) {
  return obj instanceof Asset;
}
