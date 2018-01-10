const container = require('skygear-core');
const forgotPassword = require('skygear-forgot-password');
const sso = require('skygear-sso');

// Inject sub-package modules into container.
// Should keep in-sync with (project-root)/lib/index.js.
forgotPassword.injectToContainer(container);
sso.injectToContainer(container);

module.exports = container;
