import skygear from 'skygear-core';
/**
 * Calling plugin to retrieve auth url and open in popup
 *
 * @injectTo {AuthContainer} as loginOAuthProviderWithPopup
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.loginOAuthProviderWithRedirect('google').then(...);
 */
export function _loginOAuthProviderWithRedirect(provider, options) {
  return new Promise((resolve, reject) => {
    this.container.lambda(`sso/${provider}/login_auth_url`, options)
    .then((data) => {
      window.location.href = data.auth_url; //eslint-disable-line
      resolve();
    }, (err) => {
      reject(err);
    });
  });
}

/**
 * @private
 */
export const injectToContainer = (container = skygear) => {
  const authContainerPrototype = container.auth.constructor.prototype;
  authContainerPrototype.loginOAuthProviderWithRedirect = _loginOAuthProviderWithRedirect;
};
