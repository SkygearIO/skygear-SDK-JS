import container from 'skygear-core';
import * as forgotPassword from 'skygear-forgot-password';
import * as sso from 'skygear-sso';

// Inject sub-package modules into container.
// Should keep in-sync with (project-root)/lib/index.js.
forgotPassword.injectToContainer(container);
sso.injectToContainer(container);

export default container;
