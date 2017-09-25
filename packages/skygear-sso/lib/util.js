import { SkygearError } from 'skygear-core/lib/error';


export function errorResponseFromMessage(message) {
  return {
    error: new SkygearError(message)
  };
}
