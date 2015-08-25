import {assert} from 'chai';
import jsourd from '../lib';


describe('jsourd', function () {
  it('can reconfigure end-point', function () {
    jsourd.endPoint = 'https://myseployment.com/';
    assert.equal(jsourd.endPoint, 'https://myseployment.com/');
  });
});
