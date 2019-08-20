import { JSONObject, AuthResponse, SSOLoginOptions } from "./types";
import { decodeError } from "./error";
import { decodeAuthResponse } from "./encoding";

function removeTrailingSlash(s: string): string {
  return s.replace(/\/+$/g, "");
}

/**
 * @public
 */
export function encodeQueryComponent(s: string): string {
  return encodeURIComponent(s).replace(/%20/g, "+");
}

/**
 * @public
 */
export function encodeQuery(query?: [string, string][]): string {
  if (query == null || query.length <= 0) {
    return "";
  }
  let output = "?";
  for (let i = 0; i < query.length; ++i) {
    const key = encodeQueryComponent(query[i][0]);
    const value = encodeQueryComponent(query[i][1]);

    if (key === "" && value === "") {
      continue;
    }
    if (output !== "?") {
      output += "&";
    }

    output += key;
    if (value !== "") {
      output += "=";
      output += value;
    }
  }
  return output;
}

/**
 * @public
 */
export abstract class BaseAPIClient {
  apiKey: string;
  endpoint: string;
  accessToken: string | null;

  constructor(options: {
    apiKey: string;
    endpoint: string;
    accessToken: string | null;
  }) {
    this.apiKey = options.apiKey;
    this.endpoint = removeTrailingSlash(options.endpoint);
    this.accessToken = options.accessToken;
  }

  abstract fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;

  protected prepareHeaders(): { [name: string]: string } {
    const headers: { [name: string]: string } = {
      "x-skygear-api-key": this.apiKey,
    };
    if (this.accessToken) {
      headers["x-skygear-access-token"] = this.accessToken;
    }
    return headers;
  }

  protected async request(
    method: "GET" | "POST" | "DELETE",
    path: string,
    options: { json?: JSONObject; query?: [string, string][] } = {}
  ): Promise<any> {
    const { json, query } = options;
    let url = this.endpoint + path;
    if (query != null) {
      url += encodeQuery(query);
    }

    const headers = this.prepareHeaders();
    if (json != null) {
      headers["content-type"] = "application/json";
    }

    const response = await this.fetch(url, {
      method,
      headers,
      mode: "cors",
      credentials: "include",
      body: json && JSON.stringify(json),
    });
    const jsonBody = await response.json();

    if (jsonBody["result"]) {
      return jsonBody["result"];
    } else if (jsonBody["error"]) {
      throw decodeError(jsonBody["error"]);
    }

    throw decodeError();
  }

  protected async post(
    path: string,
    options?: { json?: JSONObject; query?: [string, string][] }
  ): Promise<any> {
    return this.request("POST", path, options);
  }

  protected async get(
    path: string,
    options?: { query?: [string, string][] }
  ): Promise<any> {
    return this.request("GET", path, options);
  }

  protected async del(
    path: string,
    options: { json?: JSONObject; query?: [string, string][] }
  ): Promise<any> {
    return this.request("DELETE", path, options);
  }

  protected async postAndReturnAuthResponse(
    path: string,
    options?: { json?: JSONObject; query?: [string, string][] }
  ): Promise<AuthResponse> {
    const response = await this.post(path, options);
    return decodeAuthResponse(response);
  }

  async signup(
    loginIDs: { [key: string]: string }[] | { [key: string]: string },
    password: string,
    options?: {
      realm?: string;
      metadata?: JSONObject;
    }
  ): Promise<AuthResponse> {
    const ids: { key: string; value: string }[] = [];
    if (Array.isArray(loginIDs)) {
      for (const obj of loginIDs) {
        for (const key of Object.keys(obj)) {
          const value = obj[key];
          ids.push({ key, value });
        }
      }
    } else {
      for (const key of Object.keys(loginIDs)) {
        const value = loginIDs[key];
        ids.push({ key, value });
      }
    }
    const payload = {
      password,
      login_ids: ids,
      realm: options && options.realm,
      metadata: options && options.metadata,
    };
    return this.postAndReturnAuthResponse("/_auth/signup", { json: payload });
  }

  async login(
    loginID: string,
    password: string,
    options?: { loginIDKey?: string; realm?: string }
  ): Promise<AuthResponse> {
    const payload = {
      password,
      login_id: loginID,
      login_id_key: options && options.loginIDKey,
      realm: options && options.realm,
    };
    return this.postAndReturnAuthResponse("/_auth/login", { json: payload });
  }

  async logout(): Promise<void> {
    await this.post("/_auth/logout");
  }

  async me(): Promise<AuthResponse> {
    return this.postAndReturnAuthResponse("/_auth/me");
  }

  async changePassword(
    newPassword: string,
    oldPassword: string
  ): Promise<AuthResponse> {
    const payload = {
      password: newPassword,
      old_password: oldPassword,
    };
    return this.postAndReturnAuthResponse("/_auth/change_password", {
      json: payload,
    });
  }

  async updateMetadata(metadata: JSONObject): Promise<AuthResponse> {
    const payload = { metadata };
    return this.postAndReturnAuthResponse("/_auth/update_metadata", {
      json: payload,
    });
  }

  async requestForgotPasswordEmail(email: string): Promise<void> {
    const payload = { email };
    await this.post("/_auth/forgot_password", { json: payload });
  }

  async resetPassword(form: {
    userID: string;
    code: string;
    expireAt: number;
    newPassword: string;
  }): Promise<void> {
    const payload = {
      user_id: form.userID,
      code: form.code,
      expire_at: form.expireAt,
      new_password: form.newPassword,
    };
    await this.post("/_auth/forgot_password/reset_password", { json: payload });
  }

  async requestEmailVerification(email: string): Promise<void> {
    const payload = {
      login_id_type: "email",
      login_id: email,
    };
    await this.post("/_auth/verify_request", { json: payload });
  }

  async verifyWithCode(code: string): Promise<void> {
    const payload = { code };
    await this.post("/_auth/verify_code", { json: payload });
  }

  async loginWithCustomToken(
    token: string,
    options?: SSOLoginOptions
  ): Promise<AuthResponse> {
    const payload = {
      token,
      merge_realm: options && options.mergeRealm,
      on_user_duplicate: options && options.onUserDuplicate,
    };
    return this.postAndReturnAuthResponse("/_auth/sso/custom_token/login", {
      json: payload,
    });
  }

  async deleteOAuthProvider(providerID: string): Promise<void> {
    const encoded = encodeURIComponent(providerID);
    await this.post(`/_auth/sso/${encoded}/unlink`);
  }

  async loginOAuthProviderWithAccessToken(
    providerID: string,
    accessToken: string,
    options?: SSOLoginOptions
  ): Promise<AuthResponse> {
    const encoded = encodeURIComponent(providerID);
    const payload = {
      access_token: accessToken,
      merge_realm: options && options.mergeRealm,
      on_user_duplicate: options && options.onUserDuplicate,
    };
    return this.postAndReturnAuthResponse(`/_auth/sso/${encoded}/login`, {
      json: payload,
    });
  }

  async linkOAuthProviderWithAccessToken(
    providerID: string,
    accessToken: string
  ): Promise<AuthResponse> {
    const encoded = encodeURIComponent(providerID);
    const payload = {
      access_token: accessToken,
    };
    return this.postAndReturnAuthResponse(`/_auth/sso/${encoded}/link`, {
      json: payload,
    });
  }
}
