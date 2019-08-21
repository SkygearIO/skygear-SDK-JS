import { BaseAPIClient } from "@skygear/core";

const globalFetch = fetch;

/**
 * @public
 */
export class WebAPIClient extends BaseAPIClient {
  fetchFunction = globalFetch;
}
