const container = require('skygear-core');
const forgotPassword = require('skygear-forgot-password');
const sso = require('skygear-sso');

forgotPassword.injectToContainer(container);
sso.injectToContainer(container);

module.exports = container;
