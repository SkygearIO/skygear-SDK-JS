import { GlobalJSONContainerStorage } from "@skygear/core";
export * from "@skygear/core";
import { WebAPIClient } from "./client";
export * from "./client";
import { localStorageStorageDriver } from "./storage";
export * from "./storage";
import { WebContainer } from "./container";
export * from "./container";

/**
 * @public
 */
export const defaultContainer: WebContainer<WebAPIClient> = new WebContainer(
  "default",
  new WebAPIClient({
    apiKey: "",
    endpoint: "",
    accessToken: null,
  }),
  new GlobalJSONContainerStorage(localStorageStorageDriver)
);
