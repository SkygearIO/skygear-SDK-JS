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
      $name: this.name
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
