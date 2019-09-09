import {
  JSONObject,
  AuthResponse,
  SSOLoginOptions,
  Session,
  OAuthAuthorizationURLOptions,
} from "./types";
import { decodeError } from "./error";
import { decodeAuthResponse, decodeSession } from "./encoding";
import { encodeBase64 } from "./base64";

/**
 * @internal
 */
export function _removeTrailingSlash(s: string): string {
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
  /**
   * @internal
   */
  _accessToken: string | null;
  fetchFunction?: typeof fetch;
  requestClass?: typeof Request;
  refreshTokenFunction?: () => Promise<boolean>;
  userAgent?: string;
  getExtraSessionInfo?: () => Promise<JSONObject | null>;

  constructor(options: {
    apiKey: string;
    endpoint: string;
    accessToken: string | null;
  }) {
    this.apiKey = options.apiKey;
    this.endpoint = _removeTrailingSlash(options.endpoint);
    this._accessToken = options.accessToken;
  }

  protected async prepareHeaders(): Promise<{ [name: string]: string }> {
    const headers: { [name: string]: string } = {
      "x-skygear-api-key": this.apiKey,
    };
    if (this._accessToken) {
      headers["authorization"] = `bearer ${this._accessToken}`;
    }
    if (this.userAgent !== undefined) {
      headers["user-agent"] = this.userAgent;
    }
    if (this.getExtraSessionInfo) {
      const extraSessionInfo = await this.getExtraSessionInfo();
      if (extraSessionInfo) {
        headers["x-skygear-extra-info"] = encodeBase64(
          JSON.stringify(extraSessionInfo)
        );
      }
    }
    return headers;
  }

  async fetch(
    input: string,
    init?: RequestInit,
    options: { autoRefreshToken?: boolean } = {}
  ): Promise<Response> {
    if (this.fetchFunction == null) {
      throw new Error("missing fetchFunction in api client");
    }

    if (this.requestClass == null) {
      throw new Error("missing requestClass in api client");
    }

    const { autoRefreshToken = !!this.refreshTokenFunction } = options || {};

    if (typeof input !== "string") {
      throw new Error("only string path is allowed for fetch input");
    }

    const url = this.endpoint + "/" + input.replace(/^\//, "");
    const request = new this.requestClass(url, init);

    const headers = await this.prepareHeaders();
    for (const key of Object.keys(headers)) {
      request.headers.set(key, headers[key]);
    }

    let response = await this.fetchFunction(request.clone());
    if (response.status === 401 && autoRefreshToken) {
      if (!this.refreshTokenFunction) {
        throw new Error("missing refreshTokenFunction in api client");
      }

      const tokenRefreshed = await this.refreshTokenFunction();
      if (tokenRefreshed) {
        const retryRequest = request.clone();
        // use latest access token
        const headers = await this.prepareHeaders();
        for (const key of Object.keys(headers)) {
          retryRequest.headers.set(key, headers[key]);
        }

        response = await this.fetchFunction(retryRequest);
      }
    }

    return response;
  }

  protected async request(
    method: "GET" | "POST" | "DELETE",
    path: string,
    options: {
      json?: JSONObject;
      query?: [string, string][];
      autoRefreshToken?: boolean;
    } = {}
  ): Promise<any> {
    const { json, query, autoRefreshToken } = options;
    let p = path;
    if (query != null) {
      p += encodeQuery(query);
    }

    const headers: { [name: string]: string } = {};
    if (json != null) {
      headers["content-type"] = "application/json";
    }

    const response = await this.fetch(
      p,
      {
        method,
        headers,
        mode: "cors",
        credentials: "include",
        body: json && JSON.stringify(json),
      },
      { autoRefreshToken }
    );
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
    options?: {
      json?: JSONObject;
      query?: [string, string][];
      autoRefreshToken?: boolean;
    }
  ): Promise<any> {
    return this.request("POST", path, options);
  }

  protected async get(
    path: string,
    options?: { query?: [string, string][]; autoRefreshToken?: boolean }
  ): Promise<any> {
    return this.request("GET", path, options);
  }

  protected async del(
    path: string,
    options: {
      json?: JSONObject;
      query?: [string, string][];
      autoRefreshToken?: boolean;
    }
  ): Promise<any> {
    return this.request("DELETE", path, options);
  }

  protected async postAndReturnAuthResponse(
    path: string,
    options?: {
      json?: JSONObject;
      query?: [string, string][];
      autoRefreshToken?: boolean;
    }
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
    await this.post("/_auth/logout", { json: {} });
  }

  async refresh(refreshToken: string): Promise<string> {
    const payload = {
      refresh_token: refreshToken,
    };
    const response = await this.post("/_auth/refresh", {
      json: payload,
      autoRefreshToken: false,
    });
    return response.access_token;
  }

  async me(): Promise<AuthResponse> {
    return this.postAndReturnAuthResponse("/_auth/me", { json: {} });
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

  async oauthAuthorizationURL(
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

    const callbackURL =
      ("callbackURL" in options && options.callbackURL) ||
      (typeof window !== "undefined" && window.location.href);

    if (!callbackURL) {
      throw new Error("callbackURL is required");
    }

    const payload = {
      callback_url: callbackURL,
      ux_mode: options.uxMode,
      merge_realm: options.mergeRealm,
      on_user_duplicate: options.onUserDuplicate,
    };
    return this.post(path, { json: payload });
  }

  async deleteOAuthProvider(providerID: string): Promise<void> {
    const encoded = encodeURIComponent(providerID);
    await this.post(`/_auth/sso/${encoded}/unlink`, { json: {} });
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

  async listSessions(): Promise<Session[]> {
    const response = await this.post("/_auth/session/list", { json: {} });
    return (response.sessions as any[]).map(decodeSession);
  }

  async getSession(id: string): Promise<Session> {
    const payload = { session_id: id };
    const response = await this.post("/_auth/session/get", { json: payload });
    return decodeSession(response.session);
  }

  async updateSession(
    id: string,
    patch: { name?: string; data?: JSONObject }
  ): Promise<void> {
    const payload = { session_id: id, name: patch.name, data: patch.data };
    return this.post("/_auth/session/update", { json: payload });
  }

  async revokeSession(id: string): Promise<void> {
    const payload = { session_id: id };
    return this.post("/_auth/session/revoke", { json: payload });
  }

  async revokeOtherSessions(): Promise<void> {
    return this.post("/_auth/session/revoke_all", { json: {} });
  }
}
