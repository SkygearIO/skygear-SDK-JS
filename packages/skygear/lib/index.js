import container from 'skygear-core';
import forgotPassword from 'skygear-forgot-password';
import sso from 'skygear-sso';

// Inject sub-package modules into container.
// Should keep in-sync with (project-root)/lib/index.js.
forgotPassword.injectToContainer(container);
sso.injectToContainer(container);

module.exports = container;
