/**
 * @public
 */
export interface ByteArray {
  [index: number]: number;
  length: number;
}

/**
 * @public
 */
export type JSONValue = unknown;

/**
 * @public
 */
export type JSONObject = object;

/**
 * @public
 */
export interface User {
  /**
   * User ID.
   */
  id: string;
  /**
   * User creation time.
   */
  createdAt: Date;
  /**
   * User last login time.
   */
  lastLoginAt: Date;
  /**
   * Indicates whether the user is verified manually.
   */
  isManuallyVerified: boolean;
  /**
   * Indicates whether the user is verified.
   */
  isVerified: boolean;
  /**
   * Indicates whether the user is disabled.
   */
  isDisabled: boolean;
  /**
   * Indicates whether the user is anonymous user.
   */
  isAnonymous: boolean;
  /**
   * User custom metadata.
   */
  metadata: JSONObject;
}

/**
 * @public
 */
export interface Identity {
  type: string;
  claims: IdentityClaims;
}

/**
 * @public
 */
export interface IdentityClaims {
  [claim: string]: unknown;
  email?: string;
}

/**
 * @public
 */
export interface PasswordIdentity {
  /**
   * Identity ID.
   */
  id: string;
  /**
   * Identity type.
   */
  type: "password";
  /**
   * Login ID key.
   */
  loginIDKey: string;
  /**
   * Login ID.
   */
  loginID: string;
  /**
   * Identity claims.
   */
  claims: {
    /**
     * The email of this identity. Present only if the login ID key is of email
     * type.
     */
    email?: string;
  };
}

/**
 * @public
 */
export interface OAuthIdentity {
  /**
   * Identity ID.
   */
  id: string;
  /**
   * Identity type.
   */
  type: "oauth";
  /**
   * OAuth SSO provider type.
   */
  providerType: string;
  /**
   * OAuth SSO provider ID.
   */
  providerUserID: string;
  /**
   * Raw user profile from the provider.
   */
  rawProfile: JSONObject;
  /**
   * Identity claims.
   */
  claims: {
    /**
     * Email of this identity. Present only if email exists in the provider
     * user profile.
     */
    email?: string;
  };
}

/**
 * @public
 */
export interface CustomTokenIdentity {
  /**
   * Identity ID.
   */
  id: string;
  /**
   * Identity type.
   */
  type: "custom_token";
  /**
   * User ID at the provider.
   */
  providerUserID: string;
  /**
   * Raw user profile from the provider.
   */
  rawProfile: JSONObject;
  /**
   * Identity claims.
   */
  claims: {
    /**
     * Email of this identity. Present only if a "email" field exists in the
     * provider user profile.
     */
    email?: string;
  };
}

/**
 * @public
 */
export interface Session {
  /**
   * Session ID.
   */
  id: string;
  /**
   * Identity ID.
   */
  identityID: string;
  /**
   * Session creation time.
   */
  createdAt: Date;
  /**
   * Session last active time.
   */
  lastAccessedAt: Date;
  /**
   * IP of session creator.
   */
  createdByIP: string;
  /**
   * IP of session last accessor.
   */
  lastAccessedByIP: string;
  /**
   * User agent of the session.
   */
  userAgent: SessionUserAgent;
  /**
   * Session name.
   */
  name: string;
  /**
   * Custom data of session.
   */
  data: JSONObject;
}

/**
 * @public
 */
export interface SessionUserAgent {
  /**
   * Raw user agent string.
   */
  raw: string;
  /**
   * User agent name.
   */
  name: string;
  /**
   * User agent version.
   */
  version: string;
  /**
   * User agent operating system.
   */
  os: string;
  /**
   * User agent operating system version.
   */
  osVersion: string;
  /**
   * User agent device name.
   */
  deviceName: string;
  /**
   * User agent device model.
   */
  deviceModel: string;
}

/**
 * @public
 */
export interface AuthResponse {
  user: User;
  accessToken?: string;
  refreshToken?: string;
  sessionID?: string;
  expiresIn?: number;
}

/**
 * @public
 */
export interface ChallengeResponse {
  token: string;
  expire_at: string;
}

/**
 * @public
 */
export interface ContainerStorage {
  setUser(namespace: string, user: User): Promise<void>;
  setAccessToken(namespace: string, accessToken: string): Promise<void>;
  setRefreshToken(namespace: string, refreshToken: string): Promise<void>;
  setSessionID(namespace: string, sessionID: string): Promise<void>;
  setOAuthRedirectAction(
    namespace: string,
    oauthRedirectAction: string
  ): Promise<void>;
  setOAuthCodeVerifier(namespace: string, code: string): Promise<void>;
  setExtraSessionInfoOptions(
    namespace: string,
    options: ExtraSessionInfoOptions
  ): Promise<void>;
  setOIDCCodeVerifier(namespace: string, code: string): Promise<void>;
  setAnonymousKeyID(namespace: string, kid: string): Promise<void>;

  getUser(namespace: string): Promise<User | null>;
  getAccessToken(namespace: string): Promise<string | null>;
  getRefreshToken(namespace: string): Promise<string | null>;
  getSessionID(namespace: string): Promise<string | null>;
  getOAuthRedirectAction(namespace: string): Promise<string | null>;
  getOAuthCodeVerifier(namespace: string): Promise<string | null>;
  getExtraSessionInfoOptions(
    namespace: string
  ): Promise<Partial<ExtraSessionInfoOptions> | null>;
  getOIDCCodeVerifier(namespace: string): Promise<string | null>;
  getAnonymousKeyID(namespace: string): Promise<string | null>;

  delUser(namespace: string): Promise<void>;
  delAccessToken(namespace: string): Promise<void>;
  delRefreshToken(namespace: string): Promise<void>;
  delSessionID(namespace: string): Promise<void>;
  delOAuthRedirectAction(namespace: string): Promise<void>;
  delOAuthCodeVerifier(namespace: string): Promise<void>;
  delOIDCCodeVerifier(namespace: string): Promise<void>;
  delAnonymousKeyID(namespace: string): Promise<void>;
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
  /**
   * Configures behavior when a duplicated user is detected.
   *
   * @remarks
   * This feature must be enabled in configuration, otherwise it will fail.
   */
  onUserDuplicate?: "abort" | "merge" | "create";
}

/**
 * @public
 */
export type FullOAuthAuthorizationURLOptions = OAuthAuthorizationURLOptions & {
  providerID: string;
  codeChallenge: string;
};

/**
 * @public
 */
export type OAuthAuthorizationURLOptions =
  | OAuthWebRedirectAuthorizationURLOptions
  | OAuthWebPopupAuthorizationURLOptions
  | OAuthMobileAppAuthorizationURLOptions
  | OAuthManualAuthorizationURLOptions;

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

/**
 * @public
 */
export interface OAuthMobileAppAuthorizationURLOptions extends SSOLoginOptions {
  action: "login" | "link";
  callbackURL: string;
  uxMode: "mobile_app";
}

/**
 * @public
 */
export interface OAuthManualAuthorizationURLOptions extends SSOLoginOptions {
  uxMode: "manual";
  callbackURL: string;
  action: "login" | "link";
}

/**
 * @public
 */
export interface ContainerOptions<T> {
  name?: string;
  apiClient?: T;
  storage?: ContainerStorage;
}

/**
 * @public
 */
export interface ExtraSessionInfoOptions {
  /**
   * Device name.
   */
  deviceName?: string;
}

/**
 * OAuthError represents the oauth error response.
 * https://tools.ietf.org/html/rfc6749#section-4.1.2.1
 *
 * @public
 */
export interface OAuthError {
  state?: string;
  error: string;
  error_description?: string;
  error_uri?: string;
}

/**
 * @internal
 */
export interface _OIDCConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  revocation_endpoint: string;
  end_session_endpoint: string;
}

/**
 * @internal
 */
export interface _OIDCTokenRequest {
  grant_type:
    | "authorization_code"
    | "refresh_token"
    | "urn:skygear-auth:params:oauth:grant-type:anonymous-request";
  client_id: string;
  redirect_uri?: string;
  code?: string;
  code_verifier?: string;
  refresh_token?: string;
  jwt?: string;
}

/**
 * @internal
 */
export interface _OIDCTokenResponse {
  id_token: string;
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}
