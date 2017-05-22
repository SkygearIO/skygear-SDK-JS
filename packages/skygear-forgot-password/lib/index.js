import skygear from 'skygear-core';

function _forgetPassword(email) {
  return this.lambda('user:forgot-password', {
    email: email
  });
}

function _resetPassword(userID, code, expireAt, newPassword) {
  return this.lambda('user:reset-password', {
    user_id: userID,     /* eslint camelcase: 0 */
    code: code,          /* eslint camelcase: 0 */
    expire_at: expireAt, /* eslint camelcase: 0 */
    new_password: newPassword
  });
}

export const forgetPassword = _forgetPassword.bind(skygear);
export const resetPassword = _resetPassword.bind(skygear);

export const injectToContainer = (container = skygear) => {
  container.constructor.prototype.forgetPassword = _forgetPassword;
  container.constructor.prototype.resetPassword = _resetPassword;
};
