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
export interface Session {
  id: string;
  identityID: string;
  createdAt: Date;
  lastAccessedAt: Date;
  createdByIP: string;
  lastAccessedByIP: string;
  userAgent: SessionUserAgent;
  name: string;
  data: JSONObject;
}

/**
 * @public
 */
export interface SessionUserAgent {
  raw: string;
  name: string;
  version: string;
  os: string;
  osVersion: string;
  deviceName: string;
  deviceModel: string;
}

/**
 * @public
 */
export interface AuthResponse {
  user: User;
  identity?: Identity;
  accessToken?: string;
  refreshToken?: string;
  sessionID?: string;
}

/**
 * @public
 */
export interface ContainerStorage {
  setUser(namespace: string, user: User): Promise<void>;
  setIdentity(namespace: string, identity: Identity): Promise<void>;
  setAccessToken(namespace: string, accessToken: string): Promise<void>;
  setRefreshToken(namespace: string, refreshToken: string): Promise<void>;
  setSessionID(namespace: string, sessionID: string): Promise<void>;
  setOAuthRedirectAction(
    namespace: string,
    oauthRedirectAction: string
  ): Promise<void>;
  setExtraSessionInfoOptions(
    namespace: string,
    options: ExtraSessionInfoOptions
  ): Promise<void>;
  getUser(namespace: string): Promise<User | null>;
  getIdentity(namespace: string): Promise<Identity | null>;
  getAccessToken(namespace: string): Promise<string | null>;
  getRefreshToken(namespace: string): Promise<string | null>;
  getSessionID(namespace: string): Promise<string | null>;
  getOAuthRedirectAction(namespace: string): Promise<string | null>;
  getExtraSessionInfoOptions(
    namespace: string
  ): Promise<Partial<ExtraSessionInfoOptions> | null>;
  delUser(namespace: string): Promise<void>;
  delIdentity(namespace: string): Promise<void>;
  delAccessToken(namespace: string): Promise<void>;
  delRefreshToken(namespace: string): Promise<void>;
  delSessionID(namespace: string): Promise<void>;
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
  deviceName?: string;
}

/**
 * @public
 */
export type Authenticator =
  | TOTPAuthenticator
  | OOBSMSAuthenticator
  | OOBEmailAuthenticator;

/**
 * @public
 */
export interface TOTPAuthenticator {
  id: string;
  type: "totp";
  createdAt: Date;
  activatedAt: Date;
  displayName: string;
}

/**
 * @public
 */
export interface OOBSMSAuthenticator {
  id: string;
  type: "oob";
  createdAt: Date;
  activatedAt: Date;
  channel: "sms";
  maskedPhone: string;
}

/**
 * @public
 */
export interface OOBEmailAuthenticator {
  id: string;
  type: "oob";
  createdAt: Date;
  activatedAt: Date;
  channel: "email";
  maskedEmail: string;
}

/**
 * @public
 */
export interface GenerateOTPAuthURIOptions {
  secret: string;
  issuer: string;
  accountName: string;
}

/**
 * @public
 */
export interface CreateNewTOTPOptions {
  displayName: string;
  issuer: string;
  accountName: string;
}

/**
 * @public
 */
export interface CreateNewTOTPResult {
  authenticatorID: string;
  authenticatorType: "totp";
  secret: string;
  otpauthURI: string;
  qrCodeImageURL: string;
}

/**
 * @public
 */
export interface ActivateTOTPResult {
  recoveryCodes?: string[];
}

/**
 * @public
 */
export interface AuthenticateWithTOTPOptions {
  otp: string;
  skipMFAForCurrentDevice?: boolean;
}

/**
 * @public
 */
export type CreateNewOOBOptions =
  | CreateNewOOBSMSOptions
  | CreateNewOOBEmailOptions;

/**
 * @public
 */
export interface CreateNewOOBSMSOptions {
  channel: "sms";
  phone: string;
}

/**
 * @public
 */
export interface CreateNewOOBEmailOptions {
  channel: "email";
  email: string;
}

/**
 * @public
 */
export interface CreateNewOOBResult {
  authenticatorID: string;
  authenticatorType: "oob";
  channel: "sms" | "email";
}

/**
 * @public
 */
export interface ActivateOOBResult {
  recoveryCodes?: string[];
}
