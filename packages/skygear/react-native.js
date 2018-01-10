const container = require('skygear-core/dist/react-native/index.js');
const forgotPassword = require('skygear-forgot-password');
const sso = require('skygear-sso');

// Inject sub-package modules into container.
// Should keep in-sync with (project-root)/react-native.js.
forgotPassword.injectToContainer(container);
sso.injectToContainer(container);

module.exports = container;
