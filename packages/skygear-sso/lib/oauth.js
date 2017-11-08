/* global window:false */
import cookies from 'js-cookie';
import { atob } from 'Base64';
import { NewWindowObserver, PostAuthResultObserver } from './observer';
import { errorResponseFromMessage } from './util';
/**
 * Calling plugin to retrieve auth url and open in popup
 *
 * @injectTo {AuthContainer} as loginOAuthProviderWithPopup
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.loginOAuthProviderWithPopup('google').then(...);
 */
export function loginOAuthProviderWithPopup(provider, options) {
  var newWindow = window.open('', '_blank', 'height=700,width=500');
  this._oauthWindowObserver = this._oauthWindowObserver ||
    new NewWindowObserver();
  this._oauthResultObserver = this._oauthResultObserver ||
    new PostAuthResultObserver();

  const onLoginCompleted = () => {
    newWindow.close();
    this._oauthWindowObserver.unsubscribe();
    this._oauthResultObserver.unsubscribe();
  };

  return this.container.lambda(`sso/${provider}/login_auth_url`, {
    ux_mode: 'web_popup', //eslint-disable-line camelcase
    callback_url: window.location.href, //eslint-disable-line camelcase
    ...options
  })
  .then((data) => {
    newWindow.location.href = data.auth_url; //eslint-disable-line camelcase
    return Promise.race([
      this._oauthWindowObserver.subscribe(newWindow),
      this._oauthResultObserver.subscribe()
    ]);
  }).then((result) => {
    onLoginCompleted();
    return this.container.auth._authResolve(result);
  }, (error) => {
    onLoginCompleted();
    return Promise.reject(error);
  });
}

/**
 * Calling plugin to retrieve and redirect to auth url
 *
 * @injectTo {AuthContainer} as loginOAuthProviderWithRedirect
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.loginOAuthProviderWithRedirect('google').then(...);
 */
export function loginOAuthProviderWithRedirect(provider, options) {
  return new Promise((resolve, reject) => {
    this.container.lambda(`sso/${provider}/login_auth_url`, {
      ux_mode: 'web_redirect', //eslint-disable-line
      ...options
    })
    .then((data) => {
      window.location.href = data.auth_url; //eslint-disable-line
      resolve();
    }, (err) => {
      reject(err);
    });
  });
}

/**
 * Auth flow handler script
 *
 * @injectTo {AuthContainer} as authHandler
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.oauthHandler().then(...);
 */
export function oauthHandler() {
  return new Promise((resolve, reject) => {
    this.container.lambda('sso/config')
    .then((data) => {
      let authorizedUrls = data.authorized_urls; //eslint-disable-line
      if (window.opener) {
        // popup
        _postSSOResultToWindow(window.opener, authorizedUrls);
        resolve();
      } else {
        reject(errorResponseFromMessage('Fail to find opener'));
      }
    }, (err) => {
      reject(err);
    });
  });
}

function _postSSOResultToWindow(window, authorizedUrls) {
  let resultStr = cookies.get('sso_data');
  cookies.remove('sso_data');
  let data = resultStr && JSON.parse(atob(resultStr));
  let callbackURL = data && data.callback_url; //eslint-disable-line camelcase
  let result = data && data.result;
  var error = null;
  if (!result) {
    error = 'Fail to retrieve result';
  } else if (!callbackURL) {
    error = 'Fail to retrieve callbackURL';
  } else if (!_validateCallbackUrl(callbackURL, authorizedUrls)) {
    error = `Unauthorized domain: ${callbackURL}`;
  } else {
    window.postMessage({
      type: 'result',
      result
    }, callbackURL);
  }
  window.postMessage({
    type: 'end',
    error
  }, '*');
}

function _validateCallbackUrl(url, authorizedUrls) {
  if (!url) {
    return false;
  }

  // if no authorized urls are set, all domain is allowed
  if (authorizedUrls.length === 0) {
    return true;
  }

  for (let u of authorizedUrls) {
    let regex = new RegExp(`^${u}`, 'i');
    if (url && url.match(regex)) {
      return true;
    }
  }

  return false;
}
