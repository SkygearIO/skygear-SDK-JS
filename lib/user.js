import _ from 'lodash';

export default class User {

  constructor(attrs) {
    if (!_.isString(attrs.user_id)) { //eslint-disable-line
      throw new Error(
        'Missing user_id.');
    }
    this.email = attrs.email;
    this.username = attrs.username;
    this.ID = attrs.user_id;
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
