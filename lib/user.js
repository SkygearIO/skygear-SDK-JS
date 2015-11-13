import _ from 'lodash';

export default class User {

  constructor(attrs) {
    if (!_.isString(attrs.user_id)) {
      throw new Error(
        'Missing user_id.');
    }
    this.email = attrs.email;
    this.username = attrs.username;
    this.ID = attrs.user_id;
  }

}
