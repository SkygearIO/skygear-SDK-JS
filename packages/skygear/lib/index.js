module.exports = require('skygear-core');

const forgotPassword = require('skygear-forgot-password');
for (let key in forgotPassword) {
  module.exports[key] = forgotPassword[key];
}
