import {expect, assert} from 'chai';
import Database from '../lib/database';

describe('Database', function () {

  it('Reject invalid database_id', function () {
    expect(function() {
      new Database('_invalid');
    }).to.throw(
      'Invalid database_id'
    );
  });

});
