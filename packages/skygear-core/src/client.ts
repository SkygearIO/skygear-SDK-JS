import URLSearchParams from "core-js-pure/features/url-search-params";

import {
  AuthResponse,
  _OIDCConfiguration,
  _OIDCTokenResponse,
  _OIDCTokenRequest,
  OAuthError,
  ChallengeResponse,
} from "./types";
import { decodeError, SkygearError } from "./error";
import {
  decodeAuthResponse,
  _decodeAuthResponseFromOIDCUserinfo,
} from "./encoding";

const refreshTokenWindow = 0.7;

/**
 * @internal
 */
export function _removeTrailingSlash(s: string): string {
  return s.replace(/\/+$/g, "");
}

/**
 * @public
 */
export abstract class BaseAPIClient {
  authEndpoint: string;
  /**
   * @internal
   */
  _accessToken: string | null;
  /**
   * @internal
   *
   * _shouldRefreshTokenAt is the timestamp that the sdk should refresh token
   * 0 means doesn't need to refresh
   */
  _shouldRefreshTokenAt: number;
  fetchFunction?: typeof fetch;
  requestClass?: typeof Request;
  refreshTokenFunction?: () => Promise<boolean>;
  userAgent?: string;

  private config?: _OIDCConfiguration;

  constructor() {
    this.authEndpoint = "";
    this._accessToken = null;
    this._shouldRefreshTokenAt = 0;
  }

  setShouldNotRefreshToken() {
    this._shouldRefreshTokenAt = 0;
  }

  setShouldRefreshTokenNow() {
    this._shouldRefreshTokenAt = new Date().getTime();
  }

  setAccessTokenAndExpiresIn(accessToken: string, expires_in?: number) {
    this._accessToken = accessToken;
    if (expires_in) {
      this._shouldRefreshTokenAt =
        new Date().getTime() + expires_in * 1000 * refreshTokenWindow;
    } else {
      this._shouldRefreshTokenAt = 0;
    }
  }

  setEndpoint(authEndpoint: string) {
    this.authEndpoint = _removeTrailingSlash(authEndpoint);
  }

  protected async prepareHeaders(): Promise<{ [name: string]: string }> {
    const headers: { [name: string]: string } = {};
    if (this._accessToken) {
      headers["authorization"] = `bearer ${this._accessToken}`;
    }
    if (this.userAgent !== undefined) {
      headers["user-agent"] = this.userAgent;
    }
    return headers;
  }

  /**
   * @internal
   */
  async _fetch(url: string, init?: RequestInit): Promise<Response> {
    if (!this.fetchFunction) {
      throw new Error("missing fetchFunction in api client");
    }

    if (!this.requestClass) {
      throw new Error("missing requestClass in api client");
    }
    const request = new this.requestClass(url, init);
    return this.fetchFunction(request);
  }

  async fetch(
    endpoint: string,
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

    const { autoRefreshToken = !!this.refreshTokenFunction } = options;

    if (typeof input !== "string") {
      throw new Error("only string path is allowed for fetch input");
    }

    // check if need to refresh token
    const shouldRefreshToken =
      this._accessToken &&
      this._shouldRefreshTokenAt &&
      this._shouldRefreshTokenAt < new Date().getTime();
    if (shouldRefreshToken && autoRefreshToken) {
      if (!this.refreshTokenFunction) {
        throw new Error("missing refreshTokenFunction in api client");
      }
      await this.refreshTokenFunction();
    }

    const url = endpoint + "/" + input.replace(/^\//, "");
    const request = new this.requestClass(url, init);

    const headers = await this.prepareHeaders();
    for (const key of Object.keys(headers)) {
      request.headers.set(key, headers[key]);
    }

    return this.fetchFunction(request);
  }

  protected async request(
    method: "GET" | "POST" | "DELETE",
    endpoint: string,
    path: string,
    options: {
      json?: unknown;
      query?: [string, string][];
      autoRefreshToken?: boolean;
    } = {}
  ): Promise<any> {
    const { json, query, autoRefreshToken } = options;
    let p = path;
    if (query != null && query.length > 0) {
      const params = new URLSearchParams();
      for (let i = 0; i < query.length; ++i) {
        params.append(query[i][0], query[i][1]);
      }
      p += "?" + params.toString();
    }

    const headers: { [name: string]: string } = {};
    if (json != null) {
      headers["content-type"] = "application/json";
    }

    const response = await this.fetch(
      endpoint,
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

    let jsonBody;
    try {
      jsonBody = await response.json();
    } catch (err) {
      if (response.status < 200 || response.status >= 300) {
        throw new SkygearError(
          "unexpected status code",
          "InternalError",
          "UnexpectedError",
          {
            status_code: response.status,
          }
        );
      } else {
        throw new SkygearError(
          "failed to decode response JSON",
          "InternalError",
          "UnexpectedError"
        );
      }
    }

    if (jsonBody["result"]) {
      return jsonBody["result"];
    } else if (jsonBody["error"]) {
      throw decodeError(jsonBody["error"]);
    }

    throw decodeError();
  }

  protected async post(
    endpoint: string,
    path: string,
    options?: {
      json?: unknown;
      query?: [string, string][];
      autoRefreshToken?: boolean;
    }
  ): Promise<any> {
    return this.request("POST", endpoint, path, options);
  }

  protected async get(
    endpoint: string,
    path: string,
    options?: { query?: [string, string][]; autoRefreshToken?: boolean }
  ): Promise<any> {
    return this.request("GET", endpoint, path, options);
  }

  protected async del(
    endpoint: string,
    path: string,
    options: {
      json?: unknown;
      query?: [string, string][];
      autoRefreshToken?: boolean;
    }
  ): Promise<any> {
    return this.request("DELETE", endpoint, path, options);
  }

  protected async postAuth(
    path: string,
    options?: {
      json?: unknown;
      query?: [string, string][];
      autoRefreshToken?: boolean;
    }
  ): Promise<any> {
    return this.request("POST", this.authEndpoint, path, options);
  }

  protected async getAuth(
    path: string,
    options?: { query?: [string, string][]; autoRefreshToken?: boolean }
  ): Promise<any> {
    return this.request("GET", this.authEndpoint, path, options);
  }

  protected async delAuth(
    path: string,
    options: {
      json?: unknown;
      query?: [string, string][];
      autoRefreshToken?: boolean;
    }
  ): Promise<any> {
    return this.request("DELETE", this.authEndpoint, path, options);
  }

  protected async postAndReturnAuthResponse(
    path: string,
    options?: {
      json?: unknown;
      query?: [string, string][];
      autoRefreshToken?: boolean;
    }
  ): Promise<AuthResponse> {
    const response = await this.postAuth(path, options);
    return decodeAuthResponse(response);
  }

  /**
   * @internal
   */
  async _fetchOIDCRequest(url: string, init?: RequestInit): Promise<Response> {
    const resp = await this._fetch(url, init);
    if (resp.status === 200) {
      return resp;
    }
    let errJSON;
    try {
      errJSON = await resp.json();
    } catch {
      throw new SkygearError(
        "failed to decode response JSON",
        "InternalError",
        "UnexpectedError",
        {
          status_code: resp.status,
        }
      );
    }
    const oauthError: OAuthError = {
      error: errJSON["error"],
      error_description: errJSON["error_description"],
    };
    throw oauthError;
  }

  /**
   * @internal
   */
  async _fetchOIDCJSON(url: string, init?: RequestInit): Promise<any> {
    const resp = await this._fetchOIDCRequest(url, init);
    let jsonBody;
    try {
      jsonBody = await resp.json();
    } catch {
      throw new SkygearError(
        "failed to decode response JSON",
        "InternalError",
        "UnexpectedError"
      );
    }
    return jsonBody;
  }

  /**
   * @internal
   */
  async _fetchOIDCConfiguration(): Promise<_OIDCConfiguration> {
    if (!this.config) {
      this.config = (await this._fetchOIDCJSON(
        `${this.authEndpoint}/.well-known/openid-configuration`
      )) as _OIDCConfiguration;
    }
    return this.config;
  }

  /**
   * @internal
   */
  async _oidcTokenRequest(req: _OIDCTokenRequest): Promise<_OIDCTokenResponse> {
    const config = await this._fetchOIDCConfiguration();
    const query = new URLSearchParams();
    query.append("grant_type", req.grant_type);
    query.append("client_id", req.client_id);
    if (req.code) {
      query.append("code", req.code);
    }
    if (req.redirect_uri) {
      query.append("redirect_uri", req.redirect_uri);
    }
    if (req.code_verifier) {
      query.append("code_verifier", req.code_verifier);
    }
    if (req.refresh_token) {
      query.append("refresh_token", req.refresh_token);
    }
    if (req.jwt) {
      query.append("jwt", req.jwt);
    }
    return this._fetchOIDCJSON(config.token_endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: query.toString(),
    });
  }

  /**
   * @internal
   */
  async _oidcUserInfoRequest(accessToken?: string): Promise<AuthResponse> {
    const headers: { [name: string]: string } = {};
    if (accessToken) {
      headers["authorization"] = `bearer ${accessToken}`;
    }
    const config = await this._fetchOIDCConfiguration();
    const userinfo = await this._fetchOIDCJSON(config.userinfo_endpoint, {
      method: "GET",
      headers: headers,
      mode: "cors",
      credentials: "include",
    });
    const result = _decodeAuthResponseFromOIDCUserinfo(userinfo);
    return result;
  }

  /**
   * @internal
   */
  async _oidcRevocationRequest(refreshToken: string): Promise<void> {
    const config = await this._fetchOIDCConfiguration();
    const query = new URLSearchParams({
      token: refreshToken,
    });
    await this._fetchOIDCRequest(config.revocation_endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: query.toString(),
    });
  }

  async oauthChallenge(purpose: string): Promise<ChallengeResponse> {
    return this.postAuth("/oauth2/challenge", { json: { purpose } });
  }
}
