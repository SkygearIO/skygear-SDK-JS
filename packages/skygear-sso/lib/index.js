import skygear from 'skygear-core';
import {
  loginOAuthProviderWithPopup,
  loginOAuthProviderWithRedirect,
  linkOAuthProviderWithPopup,
  linkOAuthProviderWithRedirect,
  oauthHandler,
  getLoginRedirectResult,
  getLinkRedirectResult,
  iframeHandler,
  loginOAuthProviderWithAccessToken,
  linkOAuthProviderWithAccessToken,
  unlinkOAuthProvider
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
  authContainerPrototype.linkOAuthProviderWithPopup =
    linkOAuthProviderWithPopup;
  authContainerPrototype.linkOAuthProviderWithRedirect =
    linkOAuthProviderWithRedirect;
  authContainerPrototype.oauthHandler = oauthHandler;
  authContainerPrototype.getLoginRedirectResult = getLoginRedirectResult;
  authContainerPrototype.getLinkRedirectResult = getLinkRedirectResult;
  authContainerPrototype.iframeHandler = iframeHandler;
  authContainerPrototype.loginOAuthProviderWithAccessToken =
    loginOAuthProviderWithAccessToken;
  authContainerPrototype.linkOAuthProviderWithAccessToken =
    linkOAuthProviderWithAccessToken;
  authContainerPrototype.unlinkOAuthProvider =
    unlinkOAuthProvider;
};
