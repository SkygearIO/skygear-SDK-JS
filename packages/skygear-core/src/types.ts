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
  // undefined is not valid json value but it is included
  // so that undefined value is skipped.
  [key: string]: JSONValue | undefined;
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

export interface ContainerStorage {
  setUser(namespace: string, user: User): Promise<void>;
  setIdentity(namespace: string, identity: Identity): Promise<void>;
  setAccessToken(namespace: string, accessToken: string): Promise<void>;
  setOAuthRedirectAction(
    namespace: string,
    oauthRedirectAction: string
  ): Promise<void>;
  getUser(namespace: string): Promise<User | null>;
  getIdentity(namespace: string): Promise<Identity | null>;
  getAccessToken(namespace: string): Promise<string | null>;
  getOAuthRedirectAction(namespace: string): Promise<string | null>;
  delUser(namespace: string): Promise<void>;
  delIdentity(namespace: string): Promise<void>;
  delAccessToken(namespace: string): Promise<void>;
  delOAuthRedirectAction(namespace: string): Promise<void>;
}

/**
 * @public
 */
export interface StorageDriver {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

/**
 * @public
 */
export interface SSOLoginOptions {
  mergeRealm?: string;
  onUserDuplicate?: "abort" | "merge" | "create";
}

/**
 * @public
 */
export type OAuthAuthorizationURLOptions =
  | OAuthWebRedirectAuthorizationURLOptions
  | OAuthWebPopupAuthorizationURLOptions;

/**
 * @public
 */
export interface OAuthWebRedirectAuthorizationURLOptions
  extends SSOLoginOptions {
  action: "login" | "link";
  callbackURL: string;
  uxMode: "web_redirect";
}

/**
 * @public
 */
export interface OAuthWebPopupAuthorizationURLOptions extends SSOLoginOptions {
  action: "login" | "link";
  uxMode: "web_popup";
}
