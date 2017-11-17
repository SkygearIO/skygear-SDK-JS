import skygear from 'skygear-core';

export function errorResponseFromMessage(message) {
  return {
    error: new skygear.Error(message)
  };
}
