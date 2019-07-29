import { SSOLoginOptions } from "@skygear/core";

/**
 * @public
 */
export interface OAuthAuthorizationURLOptions extends SSOLoginOptions {
  action: "login" | "link";
  callbackURL?: string;
  uxMode: "web_redirect" | "web_popup";
}
