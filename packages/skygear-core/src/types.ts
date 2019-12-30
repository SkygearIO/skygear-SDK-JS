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
   * Indicates whether the user is verified.
   */
  isVerified: boolean;
  /**
   * Indicates whether the user is disabled.
   */
  isDisabled: boolean;
  /**
   * User custom metadata.
   */
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
  identity?: Identity;
  accessToken?: string;
  refreshToken?: string;
  sessionID?: string;
  mfaBearerToken?: string;
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
  setOAuthCodeVerifier(namespace: string, code: string): Promise<void>;
  setExtraSessionInfoOptions(
    namespace: string,
    options: ExtraSessionInfoOptions
  ): Promise<void>;
  setAuthenticationSession(
    namespace: string,
    authenticationSession: AuthenticationSession
  ): Promise<void>;
  setMFABearerToken(namespace: string, mfaBearerToken: string): Promise<void>;

  getUser(namespace: string): Promise<User | null>;
  getIdentity(namespace: string): Promise<Identity | null>;
  getAccessToken(namespace: string): Promise<string | null>;
  getRefreshToken(namespace: string): Promise<string | null>;
  getSessionID(namespace: string): Promise<string | null>;
  getOAuthRedirectAction(namespace: string): Promise<string | null>;
  getOAuthCodeVerifier(namespace: string): Promise<string | null>;
  getExtraSessionInfoOptions(
    namespace: string
  ): Promise<Partial<ExtraSessionInfoOptions> | null>;
  getAuthenticationSession(
    namespace: string
  ): Promise<AuthenticationSession | null>;
  getMFABearerToken(namespace: string): Promise<string | null>;

  delUser(namespace: string): Promise<void>;
  delIdentity(namespace: string): Promise<void>;
  delAccessToken(namespace: string): Promise<void>;
  delRefreshToken(namespace: string): Promise<void>;
  delSessionID(namespace: string): Promise<void>;
  delOAuthRedirectAction(namespace: string): Promise<void>;
  delOAuthCodeVerifier(namespace: string): Promise<void>;
  delAuthenticationSession(namespace: string): Promise<void>;
  delMFABearerToken(namespace: string): Promise<void>;
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
  /**
   * Authenticator ID.
   */
  id: string;
  /**
   * Authenticator type.
   */
  type: "totp";
  /**
   * Authenticator creation time.
   */
  createdAt: Date;
  /**
   * Authenticator activation time.
   */
  activatedAt: Date;
  /**
   * Authenticator display name.
   */
  displayName: string;
}

/**
 * @public
 */
export interface OOBSMSAuthenticator {
  /**
   * Authenticator ID.
   */
  id: string;
  /**
   * Authenticator type.
   */
  type: "oob";
  /**
   * Authenticator creation time.
   */
  createdAt: Date;
  /**
   * Authenticator activation time.
   */
  activatedAt: Date;
  /**
   * OOB channel.
   */
  channel: "sms";
  /**
   * Masked SMS phone number, in E.164 format.
   * @example "+8522345****"
   */
  maskedPhone: string;
}

/**
 * @public
 */
export interface OOBEmailAuthenticator {
  /**
   * Authenticator ID.
   */
  id: string;
  /**
   * Authenticator type.
   */
  type: "oob";
  /**
   * Authenticator creation time.
   */
  createdAt: Date;
  /**
   * Authenticator activation time.
   */
  activatedAt: Date;
  /**
   * OOB channel.
   */
  channel: "email";
  /**
   * Masked email address, in RFC 5322 format.
   * @example "joh****\@example.com"
   */
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
  /**
   * Authenticator display name.
   */
  displayName: string;
  /**
   * Authenticator issuer.
   *
   * @remarks
   * It is not persisted and only used for the result QR code.
   */
  issuer: string;
  /**
   * Authenticator account name.
   *
   * @remarks
   * It is not persisted and only used for the result QR code.
   */
  accountName: string;
}

/**
 * @public
 */
export interface CreateNewTOTPResult {
  /**
   * Authenticator ID.
   */
  authenticatorID: string;
  /**
   * Authenticator type.
   */
  authenticatorType: "totp";
  /**
   * TOTP secret.
   *
   * @remarks
   * This cannot be retrieved using APIs; users should provide it to TOTP
   * authenticator.
   */
  secret: string;
  /**
   * Generated OTPAuth URI.
   */
  otpauthURI: string;
  /**
   * URI of QR code image for generated OTPAuth URI.
   */
  qrCodeImageURI: string;
}

/**
 * @public
 */
export interface ActivateTOTPResult {
  /**
   * List of recovery codes. Present only if it is the first activated
   * authenticator.
   */
  recoveryCodes?: string[];
}

/**
 * @public
 */
export interface AuthenticateWithTOTPOptions {
  /**
   * TOTP code.
   */
  otp: string;
  /**
   * Mark the current device as trusted device. MFA would be skipped for
   * this device for a period.
   */
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
  /**
   * OOB channel.
   */
  channel: "sms";
  /**
   * SMS phone number in E.164 format.
   */
  phone: string;
}

/**
 * @public
 */
export interface CreateNewOOBEmailOptions {
  /**
   * OOB channel.
   */
  channel: "email";
  /**
   * Email address in RFC 5322 format.
   */
  email: string;
}

/**
 * @public
 */
export interface CreateNewOOBResult {
  /**
   * Authenticator ID.
   */
  authenticatorID: string;
  /**
   * Authenticator type.
   */
  authenticatorType: "oob";
  /**
   * OOB channel.
   */
  channel: "sms" | "email";
}

/**
 * @public
 */
export interface ActivateOOBResult {
  /**
   * List of recovery codes. Present only if it is the first activated
   * authenticator.
   */
  recoveryCodes?: string[];
}

/**
 * @public
 */
export interface AuthenticateWithOOBOptions {
  /**
   * MFA code.
   */
  code: string;
  /**
   * Mark the current device as trusted device. MFA would be skipped for
   * this device for a period.
   */
  skipMFAForCurrentDevice?: boolean;
}

/**
 * @public
 */
export interface AuthenticationSession {
  /**
   * Authentication session token.
   *
   * @remarks
   * This is an opaque token. Clients should not attempt to interpret it.
   */
  token: string;
  /**
   * Current step in authentication session.
   */
  step: "identity" | "mfa";
}

/**
 * @internal
 */
export interface _PresignUploadRequest {
  prefix?: string;
  access?: "public" | "private";
  headers?: {
    [name: string]: string;
  };
}

/**
 * @internal
 */
export interface _PresignUploadResponse {
  asset_name: string;
  url: string;
  method: string;
  headers: {
    name: string;
    value: string;
  }[];
}

/**
 * @internal
 */
export interface _PresignUploadFormResponse {
  url: string;
}
