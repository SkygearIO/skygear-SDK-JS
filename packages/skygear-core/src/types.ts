/**
 * @public
 */
export type JSONValue = JSONObject | JSONArray | string | boolean | number;

/**
 * @public
 */
export interface JSONArray extends Array<JSONValue> {}

/**
 * @public
 */
export interface JSONObject {
  [key: string]: JSONValue;
}

/**
 * @public
 */
export interface User {
  id: string;
  createdAt: Date;
  lastLoginAt: Date;
  isVerified: boolean;
  isDisabled: boolean;
  metadata: JSONObject;
}

/**
 * @public
 */
export type Identity = PasswordIdentity | OAuthIdentity | CustomTokenIdentity;

/**
 * @public
 */
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

/**
 * @public
 */
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

/**
 * @public
 */
export interface CustomTokenIdentity {
  id: string;
  type: "custom_token";
  providerUserID: string;
  rawProfile: JSONObject;
  claims: {
    email?: string;
  };
}

/**
 * @public
 */
export interface AuthResponse {
  user: User;
  identity?: Identity;
  accessToken?: string;
}

/**
 * @public
 */
export interface ContainerStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}
