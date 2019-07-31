import { BaseAPIClient } from "@skygear/core";
import { OAuthAuthorizationURLOptions } from "./types";

const globalFetch = fetch;

/**
 * @public
 */
export class WebAPIClient extends BaseAPIClient {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    return globalFetch(input, init);
  }

  oauthAuthorizationURL(
    providerID: string,
    options: OAuthAuthorizationURLOptions
  ): Promise<string> {
    const encoded = encodeURIComponent(providerID);
    const { action } = options;
    let path = "";
    switch (action) {
      case "login":
        path = `/_auth/sso/${encoded}/login_auth_url`;
        break;
      case "link":
        path = `/_auth/sso/${encoded}/link_auth_url`;
        break;
      default:
        throw new Error("unreachable");
    }
    const payload = {
      callback_url: options.callbackURL,
      ux_mode: options.uxMode,
      merge_realm: options.mergeRealm,
      on_user_duplicate: options.onUserDuplicate,
    };
    return this.post(path, payload);
  }
}
