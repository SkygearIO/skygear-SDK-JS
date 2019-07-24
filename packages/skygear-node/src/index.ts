import { BaseAPIClient } from "@skygear/core";
export * from "@skygear/core";

const nodeFetch = require("node-fetch");

export class APIClient extends BaseAPIClient {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    return nodeFetch(input, init);
  }
}
