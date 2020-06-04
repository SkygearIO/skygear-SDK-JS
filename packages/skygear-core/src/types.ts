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
  metadata: unknown;
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
  setOIDCCodeVerifier(namespace: string, code: string): Promise<void>;
  setAnonymousKeyID(namespace: string, kid: string): Promise<void>;

  getUser(namespace: string): Promise<User | null>;
  getAccessToken(namespace: string): Promise<string | null>;
  getRefreshToken(namespace: string): Promise<string | null>;
  getSessionID(namespace: string): Promise<string | null>;
  getOIDCCodeVerifier(namespace: string): Promise<string | null>;
  getAnonymousKeyID(namespace: string): Promise<string | null>;

  delUser(namespace: string): Promise<void>;
  delAccessToken(namespace: string): Promise<void>;
  delRefreshToken(namespace: string): Promise<void>;
  delSessionID(namespace: string): Promise<void>;
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
export interface ContainerOptions<T> {
  name?: string;
  apiClient?: T;
  storage?: ContainerStorage;
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
