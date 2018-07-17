import skygear from 'skygear-core';

export function errorResponseFromMessage(message) {
  return new skygear.Error(message);
}
