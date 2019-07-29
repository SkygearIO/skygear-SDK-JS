import { JSONObject, AuthResponse, SSOLoginOptions } from "./types";
import { decodeError } from "./error";
import { decodeUser, decodeIdentity } from "./encoding";

function removeTrailingSlash(s: string): string {
  return s.replace(/\/+$/g, "");
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

  private async post(path: string, payload?: any): Promise<any> {
    const url = this.endpoint + path;
    const headers: any = {
      "x-skygear-api-key": this.apiKey,
    };
    if (this.accessToken) {
      headers["x-skygear-access-token"] = this.accessToken;
    }
    const response = await this.fetch(url, {
      method: "POST",
      mode: "cors",
      credentials: "include",
      headers,
      body: payload && JSON.stringify(payload),
    });
    const jsonBody = await response.json();

    if (jsonBody["result"]) {
      return jsonBody["result"];
    } else if (jsonBody["error"]) {
      throw decodeError(jsonBody["error"]);
    }

    throw decodeError();
  }

  private async postAndReturnAuthResponse(
    path: string,
    payload?: any
  ): Promise<AuthResponse> {
    const { user, identity, access_token } = await this.post(path, payload);
    const response: AuthResponse = {
      user: decodeUser(user),
    };
    if (identity) {
      response.identity = decodeIdentity(identity);
    }
    if (access_token) {
      response.accessToken = access_token;
    }
    return response;
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
    return this.postAndReturnAuthResponse("/_auth/signup", payload);
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
    return this.postAndReturnAuthResponse("/_auth/login", payload);
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
    return this.postAndReturnAuthResponse("/_auth/change_password", payload);
  }

  async updateMetadata(metadata: JSONObject): Promise<AuthResponse> {
    const payload = { metadata };
    return this.postAndReturnAuthResponse("/_auth/update_metadata", payload);
  }

  async requestForgotPasswordEmail(email: string): Promise<void> {
    const payload = { email };
    await this.post("/_auth/forgot_password", payload);
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
    await this.post("/_auth/forgot_password/reset_password", payload);
  }

  async requestEmailVerification(email: string): Promise<void> {
    const payload = {
      login_id_type: "email",
      login_id: email,
    };
    await this.post("/_auth/verify_request", payload);
  }

  async verifyWithCode(code: string): Promise<void> {
    const payload = { code };
    await this.post("/_auth/verify_code", payload);
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
    return this.postAndReturnAuthResponse(
      "/_auth/sso/custom_token/login",
      payload
    );
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
    return this.postAndReturnAuthResponse(
      `/_auth/sso/${encoded}/login`,
      payload
    );
  }

  async linkOAuthProviderWithAccessToken(
    providerID: string,
    accessToken: string
  ): Promise<AuthResponse> {
    const encoded = encodeURIComponent(providerID);
    const payload = {
      access_token: accessToken,
    };
    return this.postAndReturnAuthResponse(
      `/_auth/sso/${encoded}/link`,
      payload
    );
  }
}
