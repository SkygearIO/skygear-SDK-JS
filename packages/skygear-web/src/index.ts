export * from "@skygear/core";
import { WebAPIClient } from "./client";
export * from "./client";
export * from "./storage";
import { WebContainer } from "./container";
export * from "./container";

/**
 * @public
 */
const defaultContainer: WebContainer<WebAPIClient> = new WebContainer();

export default defaultContainer;
