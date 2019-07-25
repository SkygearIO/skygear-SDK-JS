import { BaseAPIClient, ContainerStorage, Container } from "@skygear/core";
export * from "@skygear/core";

const globalFetch = fetch;
const globalLocalStorage = localStorage;

/**
 * @public
 */
export class APIClient extends BaseAPIClient {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    return globalFetch(input, init);
  }
}

/**
 * @public
 */
export const containerStorage: ContainerStorage = {
  async get(key: string): Promise<string | null> {
    return globalLocalStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    return globalLocalStorage.setItem(key, value);
  },
  async del(key: string): Promise<void> {
    return globalLocalStorage.removeItem(key);
  },
};

/**
 * @public
 */
export const defaultContainer: Container = new Container(
  "default",
  new APIClient({
    apiKey: "",
    endpoint: "",
    accessToken: null,
  }),
  containerStorage
);
