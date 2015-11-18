/*eslint-disable quote-props */
import {expect, assert} from 'chai'; //eslint-disable-line no-unused-vars
import Record from '../lib/record';
import QueryResult from '../lib/query_result';

describe('QueryResult', function () {

  let Note = Record.extend('note');

  it('create query result without info dict', function () {
    let r1 = new Note();
    let r2 = new Note();
    let result = QueryResult.createFromResult([r1, r2]);
    expect(result).to.be.an.instanceof(QueryResult);
    expect(result.length).to.be.equal(2);
    expect(result[0]).to.be.equal(r1);
    expect(result[1]).to.be.equal(r2);
    expect(result.overallCount).to.be.undefined();
  });

  it('create query result with count info', function () {
    let r1 = new Note();
    let r2 = new Note();
    let info = {'count': 24};
    let result = QueryResult.createFromResult([r1, r2], info);
    expect(result).to.be.an.instanceof(QueryResult);
    expect(result.length).to.be.equal(2);
    expect(result[0]).to.be.equal(r1);
    expect(result[1]).to.be.equal(r2);
    expect(result.overallCount).to.be.equal(24);
  });
});
/*eslint-enable quote-props */
