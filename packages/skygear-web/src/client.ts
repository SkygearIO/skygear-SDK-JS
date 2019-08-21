import { BaseAPIClient } from "@skygear/core";

const globalFetch = fetch;

/**
 * @public
 */
export class WebAPIClient extends BaseAPIClient {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    return globalFetch(input, init);
  }
}
