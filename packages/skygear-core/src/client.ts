import { JSONObject, AuthResponse, User, Identity } from "./types";
import { decodeError } from "./error";

function removeTrailingSlash(s: string): string {
  return s.replace(/\/+$/g, "");
}

function decodeUser(u: any): User {
  const id = u.id;
  const createdAt = new Date(u.created_at);
  const lastLoginAt = new Date(u.last_login_at);
  const isVerified = u.is_verified;
  const isDisabled = u.is_disabled;
  const metadata = u.metadata;
  return {
    id,
    createdAt,
    lastLoginAt,
    isVerified,
    isDisabled,
    metadata,
  };
}

function decodeIdentity(i: any): Identity {
  const id = i.id;
  const type = i.type;
  switch (type) {
    case "password":
      return {
        id,
        type: "password",
        loginIDKey: i.login_id_key,
        loginID: i.login_id,
        realm: i.realm,
        claims: i.claims,
      };
    case "oauth":
      return {
        id,
        type: "oauth",
        providerType: i.provider_type,
        providerUserID: i.provider_user_id,
        rawProfile: i.raw_profile,
        claims: i.claims,
      };
    case "custom_token":
      return {
        id,
        type: "custom_token",
        providerUserID: i.provider_user_id,
        rawProfile: i.raw_profile,
        claims: i.claims,
      };
    default:
      throw new Error("unknown identity type: " + type);
  }
}

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

  async post(path: string, payload: any): Promise<any> {
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
      body: JSON.stringify(payload),
    });
    const jsonBody = await response.json();

    if (jsonBody["result"]) {
      return jsonBody["result"];
    } else if (jsonBody["error"]) {
      throw decodeError(jsonBody["error"]);
    }

    throw decodeError();
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
    const { user, identity, access_token } = await this.post(
      "/_auth/signup",
      payload
    );
    return {
      user: decodeUser(user),
      identity: decodeIdentity(identity),
      accessToken: access_token,
    };
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
    const { user, identity, access_token } = await this.post(
      "/_auth/login",
      payload
    );
    return {
      user: decodeUser(user),
      identity: decodeIdentity(identity),
      accessToken: access_token,
    };
  }
}
