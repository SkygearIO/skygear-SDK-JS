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

export default class Asset {

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
    } else if (url) {
      // do nothing
    } else if (base64) {
      file = base64StringtoBlob(base64);
    } else {
      throw new Error('Either file or url should present');
    }

    this.name = name;
    this.file = file;
    this.contentType = contentType;
    this.url = url;
  }

  toJSON() {
    return {
      $type: 'asset',
      $name: this.name,
      $url: this.url
    };
  }

  static fromJSON(attrs) {
    return new Asset({
      name: attrs.$name,
      url: attrs.$url
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
