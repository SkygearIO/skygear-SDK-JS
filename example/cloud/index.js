const skygearCloud = require('skygear/cloud');

function includeme(skygearCloud) {
  skygearCloud.op('greeting', function(param) {
    return {
      'content': 'Hello, ' + param.name,
    };
  }, {
    keyRequired: true,
    userRequired: false,
  });
}

module.exports = {
  includeme
};
