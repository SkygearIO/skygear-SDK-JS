import { BaseAPIClient } from "@skygear/core";

/**
 * @public
 */
export class WebAPIClient extends BaseAPIClient {
  // Fetch function expect the context is window, if it doesn't we will get the
  // following error
  // TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation
  // To prevent this, we bind window to the fetch function
  fetchFunction = window.fetch.bind(window);
  requestClass = Request;
}
