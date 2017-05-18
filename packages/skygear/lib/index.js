const container = require('skygear-core');
const forgotPassword = require('skygear-forgot-password');

forgotPassword.injectToContainer(container);

module.exports = container;
