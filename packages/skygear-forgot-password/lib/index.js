import skygear from 'skygear-core';

function _forgotPassword(email) {
  return this.container.lambda('user:forgot-password', {
    email: email
  });
}

function _resetPassword(userID, code, expireAt, newPassword) {
  return this.container.lambda('user:reset-password', {
    user_id: userID,     /* eslint camelcase: 0 */
    code: code,          /* eslint camelcase: 0 */
    expire_at: expireAt, /* eslint camelcase: 0 */
    new_password: newPassword
  });
}

export const forgotPassword = _forgotPassword.bind(skygear.auth);
export const resetPassword = _resetPassword.bind(skygear.auth);

export const injectToContainer = (container = skygear) => {
  const authContainerPrototype = container.auth.constructor.prototype;
  authContainerPrototype.forgotPassword = _forgotPassword;
  authContainerPrototype.resetPassword = _resetPassword;
};
