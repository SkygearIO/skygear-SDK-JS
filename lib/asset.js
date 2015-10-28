export default class Asset {

  constructor(attrs) {
    attrs = attrs || {};

    let name = attrs.name;
    let file = attrs.file;
    let contentType = attrs.contentType;
    let url = attrs.url;

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
