import _ from 'lodash';

export default class User {

  constructor(attrs) {
    let id = attrs.user_id || attrs._id; //eslint-disable-line
    if (!_.isString(id)) {
      throw new Error(
        'Missing user_id.');
    }
    this.email = attrs.email;
    this.username = attrs.username;
    this.ID = id;
  }

  toJSON() {
    return {
      user_id: this.ID, //eslint-disable-line
      username: this.username,
      email: this.email
    };
  }

  static fromJSON(attrs) {
    return new User(attrs);
  }

}
