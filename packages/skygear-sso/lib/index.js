import skygear from 'skygear-core';
import {
  loginOAuthProviderWithPopup,
  loginOAuthProviderWithRedirect,
  oauthHandler
} from './oauth';

/**
 * @private
 */
export const injectToContainer = (container = skygear) => {
  const authContainerPrototype = container.auth.constructor.prototype;
  authContainerPrototype.loginOAuthProviderWithPopup =
    loginOAuthProviderWithPopup;
  authContainerPrototype.loginOAuthProviderWithRedirect =
    loginOAuthProviderWithRedirect;
  authContainerPrototype.oauthHandler = oauthHandler;
};
