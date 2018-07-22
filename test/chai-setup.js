var chai = require('chai');
var sinonChai = require('sinon-chai');
var dirtyChai = require('dirty-chai');

// NOTE: dirty-chai should be loaded before other chai plugins to properly
// convert property assertions
chai.use(dirtyChai);
chai.use(sinonChai);
