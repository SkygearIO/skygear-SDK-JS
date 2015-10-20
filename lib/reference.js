import Record from './record';

export default class Reference {

  constructor(attrs) {
    var id;
    if (typeof attrs === 'string') {
      id = attrs;
    } else {
      id = attrs.$id;
      if (!id) {
        id = attrs.ID;
      }
    }

    if (!id) {
      throw new Error('Empty record id');
    }

    // parse solely to test for string id validity
    Record.parseID(id);

    this._id = id;
  }

  get ID() {
    return this._id;
  }

  toJSON() {
    return {
      $id: this._id,
      $type: 'ref'
    };
  }
}
