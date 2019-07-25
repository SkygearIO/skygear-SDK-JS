export type JSONValue = JSONObject | JSONArray | string | boolean | number;

export interface JSONArray extends Array<JSONValue> {}

export interface JSONObject {
  [key: string]: JSONValue;
}

export interface User {
  id: string;
  createdAt: Date;
  lastLoginAt: Date;
  isVerified: boolean;
  isDisabled: boolean;
  metadata: JSONObject;
}

export type Identity = PasswordIdentity | OAuthIdentity | CustomTokenIdentity;

export interface PasswordIdentity {
  id: string;
  type: "password";
  loginIDKey: string;
  loginID: string;
  realm: string;
  claims: {
    email?: string;
  };
}

export interface OAuthIdentity {
  id: string;
  type: "oauth";
  providerType: string;
  providerUserID: string;
  rawProfile: JSONObject;
  claims: {
    email?: string;
  };
}

export interface CustomTokenIdentity {
  id: string;
  type: "custom_token";
  providerUserID: string;
  rawProfile: JSONObject;
  claims: {
    email?: string;
  };
}

export interface AuthResponse {
  user: User;
  identity?: Identity;
  accessToken?: string;
}

export interface ContainerStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}
