import { BaseAPIClient, ContainerStorage, Container } from "@skygear/core";
export * from "@skygear/core";

const nodeFetch = require("node-fetch");

export class APIClient extends BaseAPIClient {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    return nodeFetch(input, init);
  }
}

export class MemoryStorage implements ContainerStorage {
  backingStore: { [key: string]: string };

  constructor() {
    this.backingStore = {};
  }

  async get(key: string): Promise<string | null> {
    const value = this.backingStore[key];
    if (value != null) {
      return value;
    }
    return null;
  }
  async set(key: string, value: string): Promise<void> {
    this.backingStore[key] = value;
  }
  async del(key: string): Promise<void> {
    delete this.backingStore[key];
  }
}

export const defaultContainer: Container = new Container(
  "default",
  new APIClient({
    apiKey: "",
    endpoint: "",
    accessToken: null,
  }),
  new MemoryStorage()
);
