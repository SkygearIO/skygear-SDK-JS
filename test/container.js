import {assert} from 'chai';
import Container from '../lib/container';


describe('Container', function () {
  it('should have default end-point', function () {
    let container = new Container();
    assert.equal(
      container.endPoint,
      'http://ourd.pandawork.com/',
      'we expected default endpoint');
  });
});
