import skygear from 'skygear-core';

export const forgetPassword = (email, container = skygear) =>
  container.lambda('user:forgot-password', {
    email: email
  });

export const resetPassword = (userID, code, expireAt, newPassword, container = skygear) =>
  container.lambda('user:reset-password', {
    user_id: userID,     /* eslint camelcase: 0 */
    code: code,          /* eslint camelcase: 0 */
    expire_at: expireAt, /* eslint camelcase: 0 */
    new_password: newPassword
  });
