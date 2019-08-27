export * from "@skygear/core";
import { WebAPIClient } from "./client";
export * from "./client";
export * from "./storage";
import { WebContainer } from "./container";
export * from "./container";

/**
 * @public
 */
export const defaultContainer: WebContainer<WebAPIClient> = new WebContainer();
