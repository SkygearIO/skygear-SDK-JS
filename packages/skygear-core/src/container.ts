import {
  ContainerStorage,
  JSONObject,
  JSONValue,
  User,
  Identity,
  AuthResponse,
  SSOLoginOptions,
  ContainerOptions,
  Session,
  ExtraSessionInfoOptions,
  Authenticator,
  GenerateOTPAuthURIOptions,
  CreateNewTOTPOptions,
  CreateNewTOTPResult,
  ActivateTOTPResult,
  AuthenticateWithTOTPOptions,
  CreateNewOOBOptions,
  CreateNewOOBResult,
  ActivateOOBResult,
  AuthenticateWithOOBOptions,
} from "./types";
import { SkygearError, _extractAuthenticationSession } from "./error";
import { BaseAPIClient, _removeTrailingSlash } from "./client";
import { encodeQuery } from "./url";

const defaultExtraSessionInfoOptions: ExtraSessionInfoOptions = {
  deviceName: undefined,
};

/**
 * @public
 */
export function generateOTPAuthURI(options: GenerateOTPAuthURIOptions): string {
  let issuer = "";
  if (options.issuer) {
    issuer = encodeURI(options.issuer);
  }

  const accountName = encodeURI(options.accountName);
  const path = issuer === "" ? accountName : issuer + ":" + accountName;
  const host = "totp";
  const queryInput: [string, string][] = [["secret", options.secret]];
  if (options.issuer !== "") {
    queryInput.push(["issuer", options.issuer]);
  }
  const query = encodeQuery(queryInput);
  return `otpauth://${host}/${path}${query}`;
}

/**
 * Skygear Auth APIs.
 *
 * @public
 */
export class AuthContainer<T extends BaseAPIClient> {
  parent: Container<T>;
  mfa: MFAContainer<T>;

  /**
   * Current logged in user.
   */
  currentUser: User | null;

  /**
   * Identity of current logged in user.
   */
  currentIdentity: Identity | null;

  /**
   * Session ID of current logged in user.
   */
  currentSessionID: string | null;

  /**
   * Extra session information to be submitted to server.
   */
  extraSessionInfoOptions: ExtraSessionInfoOptions = {
    ...defaultExtraSessionInfoOptions,
  };

  constructor(parent: Container<T>) {
    this.parent = parent;
    this.currentUser = null;
    this.currentIdentity = null;
    this.currentSessionID = null;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    this.mfa = new MFAContainer(this);
  }

  /**
   * Save extra session information.
   *
   * @remarks
   * The SDK would populate extra session information from storage
   * when calling {@link Container.configure | configure}.
   */
  async saveExtraSessionInfoOptions() {
    return this.parent.storage.setExtraSessionInfoOptions(
      this.parent.name,
      this.extraSessionInfoOptions
    );
  }

  /**
   * @internal
   */
  async _getExtraSessionInfo(): Promise<JSONObject | null> {
    const options = this.extraSessionInfoOptions;

    let hasInfo = false;
    const info: Record<string, JSONValue> = {};

    if (options.deviceName) {
      info["device_name"] = options.deviceName;
      hasInfo = true;
    }

    return hasInfo ? info : null;
  }

  /**
   * @internal
   */
  async persistAuthResponse(response: AuthResponse): Promise<void> {
    // Ensure authentication session and access token are mutually exclusive
    await this._clearAuthenticationSession();

    const {
      user,
      identity,
      accessToken,
      refreshToken,
      sessionID,
      mfaBearerToken,
    } = response;

    await this.parent.storage.setUser(this.parent.name, user);

    if (identity) {
      await this.parent.storage.setIdentity(this.parent.name, identity);
    }

    if (accessToken) {
      await this.parent.storage.setAccessToken(this.parent.name, accessToken);
    }

    if (refreshToken) {
      await this.parent.storage.setRefreshToken(this.parent.name, refreshToken);
    }

    if (sessionID) {
      await this.parent.storage.setSessionID(this.parent.name, sessionID);
    }

    if (mfaBearerToken) {
      await this.parent.storage.setMFABearerToken(
        this.parent.name,
        mfaBearerToken
      );
    }

    this.currentUser = user;
    if (identity) {
      this.currentIdentity = identity;
    }
    if (accessToken) {
      this.parent.apiClient._accessToken = accessToken;
    }
    if (sessionID) {
      this.currentSessionID = sessionID;
    }
  }

  /**
   * @internal
   */
  async handleAuthenticationSession(e: unknown): Promise<AuthResponse> {
    // Detect invalid authentication session
    if (
      e instanceof SkygearError &&
      e.reason === "InvalidAuthenticationSession"
    ) {
      await this._clearAuthenticationSession();
      throw e;
    }

    // The error is AuthenticationSession
    const authenticationSession = _extractAuthenticationSession(e);
    if (authenticationSession != null) {
      // Ensure authentication session and access token are mutually exclusive
      await this._clearSession();

      // Persist authentication session
      await this.parent.storage.setAuthenticationSession(
        this.parent.name,
        authenticationSession
      );
      this.parent.apiClient._authenticationSession = authenticationSession;

      // If the step is MFA, try bearer token
      if (authenticationSession.step !== "mfa") {
        throw e;
      }

      const mfaBearerToken = await this.parent.storage.getMFABearerToken(
        this.parent.name
      );
      const bearerToken = mfaBearerToken === null ? undefined : mfaBearerToken;
      try {
        // NOTE(louis): It is very important that we use await here.
        // If we simply return the promise, the catch block cannot catch anything.
        const response = await this.parent.apiClient.authenticateWithBearerToken(
          bearerToken
        );
        return response;
      } catch (bearerTokenError) {
        // If the server told us the bearer token is invalid, delete it.
        if (
          bearerTokenError instanceof SkygearError &&
          bearerTokenError.reason === "InvalidMFABearerToken"
        ) {
          await this.parent.storage.delMFABearerToken(this.parent.name);
        }
        // re-throw the original error
        throw e;
      }
    }

    // For any other error, re-throw it.
    throw e;
  }

  /**
   * @internal
   */
  async handleAuthResponse(p: Promise<AuthResponse>): Promise<User> {
    try {
      const response = await p;
      await this.persistAuthResponse(response);
      return response.user;
    } catch (e) {
      const response = await this.handleAuthenticationSession(e);
      await this.persistAuthResponse(response);
      return response.user;
    }
  }

  /**
   * @internal
   */
  async handleMaybeAuthResponse(
    p: Promise<AuthResponse | null>
  ): Promise<User | null> {
    try {
      const response = await p;
      if (!response) {
        return null;
      }
      await this.persistAuthResponse(response);
      return response.user;
    } catch (e) {
      const response = await this.handleAuthenticationSession(e);
      await this.persistAuthResponse(response);
      return response.user;
    }
  }

  /**
   * Sign up new user.
   *
   * @example
   * ```ts
   * // Signup with email and password
   * await signup({"email": "test@example.com"}, "password");
   *
   * // Signup with email, username, and password
   * await signup(
   *   [{"email": "test@example.com"}, {"username": "test"}],
   *   "password"
   * );
   *
   * // Signup with email, password, and custom metadata
   * await signup(
   *   {"email": "test@example.com"},
   *   "password",
   *   {"metadata": {"accepted_tos": true}}
   * );
   * ```
   *
   * @param loginIDs - Login IDs
   * @param password - Password
   * @param options - Sign up options
   */
  async signup(
    loginIDs: { [key: string]: string }[] | { [key: string]: string },
    password: string,
    options?: {
      metadata?: JSONObject;
    }
  ): Promise<User> {
    return this.handleAuthResponse(
      this.parent.apiClient.signup(loginIDs, password, options)
    );
  }

  /**
   * Sign up new user with email.
   *
   * @remarks
   * Equivalent to {@link AuthContainer.signup}: `signup({"email": email}, password, options)`.
   */
  async signupWithEmail(
    email: string,
    password: string,
    options?: {
      metadata?: JSONObject;
    }
  ): Promise<User> {
    return this.signup(
      {
        email,
      },
      password,
      options
    );
  }

  /**
   * Sign up new user with username.
   *
   * @remarks
   * Equivalent to {@link AuthContainer.signup}: `signup({"username": username}, password, options)`.
   */
  async signupWithUsername(
    username: string,
    password: string,
    options?: {
      metadata?: JSONObject;
    }
  ): Promise<User> {
    return this.signup(
      {
        username,
      },
      password,
      options
    );
  }

  /**
   * Login user with password.
   *
   * @example
   * ```ts
   * // Login with email
   * await login("test\@example.com", "password");
   * // Login with username
   * await login("test", "password");
   * ```
   * @param loginID - Login ID
   * @param password - Password
   * @param options - Login options
   */
  async login(
    loginID: string,
    password: string,
    options?: { loginIDKey?: string }
  ): Promise<User> {
    return this.handleAuthResponse(
      this.parent.apiClient.login(loginID, password, options)
    );
  }

  /**
   * Logout current session.
   *
   * @remarks
   * If `force` parameter is set to `true`, all potential errors (e.g. network
   * error) would be ignored.
   *
   * @param options - Logout options
   */
  async logout(options: { force?: boolean } = {}): Promise<void> {
    const { force = false } = options;
    try {
      await this.parent.apiClient.logout();
    } catch (err) {
      if (!force) {
        throw err;
      }
    }
    await this._clearSession();
  }

  /**
   * @internal
   */
  async _clearSession() {
    await this.parent.storage.delUser(this.parent.name);
    await this.parent.storage.delIdentity(this.parent.name);
    await this.parent.storage.delAccessToken(this.parent.name);
    await this.parent.storage.delRefreshToken(this.parent.name);
    await this.parent.storage.delSessionID(this.parent.name);
    this.currentUser = null;
    this.currentIdentity = null;
    this.parent.apiClient._accessToken = null;
    this.currentSessionID = null;
  }

  /**
   * @internal
   */
  async _clearAuthenticationSession() {
    await this.parent.storage.delAuthenticationSession(this.parent.name);
    this.parent.apiClient._authenticationSession = null;
  }

  /**
   * @internal
   */
  async _refreshAccessToken(): Promise<boolean> {
    // The server only includes x-skygear-try-refresh-token if
    // the access token in the request is invalid.
    //
    // If the request does not have access token at all,
    // the server simply returns NotAuthenticated error without the header.
    //
    // Therefore, we have to keep the invalid token so that
    // if refresh fails due to other reasons, the whole process
    // can be retried.
    //
    // await this.parent.storage.delAccessToken(this.parent.name);
    // this.parent.apiClient._accessToken = null;

    const refreshToken = await this.parent.storage.getRefreshToken(
      this.parent.name
    );
    if (!refreshToken) {
      // no refresh token -> session is gone
      await this._clearSession();
      return false;
    }

    let accessToken;
    try {
      accessToken = await this.parent.apiClient.refresh(refreshToken);
    } catch (error) {
      if (
        error instanceof SkygearError &&
        error.reason === "NotAuthenticated"
      ) {
        // cannot refresh -> session is gone
        await this._clearSession();
      }
      throw error;
    }

    await this.parent.storage.setAccessToken(this.parent.name, accessToken);
    this.parent.apiClient._accessToken = accessToken;

    return true;
  }

  /**
   * Refreshes and returns current user information.
   */
  async me(): Promise<User> {
    return this.handleAuthResponse(this.parent.apiClient.me());
  }

  /**
   * Changes user password.
   *
   * @param newPassword - New password
   * @param oldPassword - Old password
   */
  async changePassword(
    newPassword: string,
    oldPassword: string
  ): Promise<User> {
    return this.handleAuthResponse(
      this.parent.apiClient.changePassword(newPassword, oldPassword)
    );
  }

  /**
   * Updates custom metadata of user.
   *
   * @remarks
   * The provided new metadata object would replace the old metadata.
   *
   * @param metadata - New custom metadata object
   */
  async updateMetadata(metadata: JSONObject): Promise<User> {
    return this.handleAuthResponse(
      this.parent.apiClient.updateMetadata(metadata)
    );
  }

  /**
   * Requests password reset email.
   *
   * @param email - Registered email address of the user
   */
  async requestForgotPasswordEmail(email: string): Promise<void> {
    return this.parent.apiClient.requestForgotPasswordEmail(email);
  }

  /**
   * Performs password reset.
   *
   * @param form - Information from password reset email
   */
  async resetPassword(form: {
    userID: string;
    code: string;
    expireAt: number;
    newPassword: string;
  }): Promise<void> {
    return this.parent.apiClient.resetPassword(form);
  }

  /**
   * Requests user email verification.
   *
   * @param email - Registered email address of the user
   */
  async requestEmailVerification(email: string): Promise<void> {
    return this.parent.apiClient.requestEmailVerification(email);
  }

  /**
   * Requests user phone SMS verification.
   *
   * @param phone - Registered phone number of the user
   */
  async requestPhoneVerification(phone: string): Promise<void> {
    return this.parent.apiClient.requestPhoneVerification(phone);
  }

  /**
   * Performs user verification.
   *
   * @param code - Verification code sent to user
   */
  async verifyWithCode(code: string): Promise<void> {
    return this.parent.apiClient.verifyWithCode(code);
  }

  /**
   * Login user with custom token.
   *
   * @param token - Custom authentication token
   * @param options - SSO login options
   */
  async loginWithCustomToken(
    token: string,
    options?: SSOLoginOptions
  ): Promise<User> {
    return this.handleAuthResponse(
      this.parent.apiClient.loginWithCustomToken(token, options)
    );
  }

  /**
   * Deletes OAuth SSO provider.
   *
   * @param providerID - SSO provider ID
   */
  async deleteOAuthProvider(providerID: string): Promise<void> {
    return this.parent.apiClient.deleteOAuthProvider(providerID);
  }

  /**
   * Login with OAuth SSO provider using access token.
   *
   * @remarks
   * This feature must be enabled in configuration, otherwise it will fail.
   *
   * @param providerID - SSO provider ID
   * @param accessToken - SSO provider access token
   * @param options - SSO login options
   */
  async loginOAuthProviderWithAccessToken(
    providerID: string,
    accessToken: string,
    options?: SSOLoginOptions
  ): Promise<User> {
    return this.handleAuthResponse(
      this.parent.apiClient.loginOAuthProviderWithAccessToken(
        providerID,
        accessToken,
        options
      )
    );
  }

  /**
   * Links with OAuth SSO provider using access token.
   *
   * @remarks
   * This feature must be enabled in configuration, otherwise it will fail.
   *
   * @param providerID - SSO provider ID
   * @param accessToken - SSO provider access token
   */
  async linkOAuthProviderWithAccessToken(
    providerID: string,
    accessToken: string
  ): Promise<User> {
    return this.handleAuthResponse(
      this.parent.apiClient.linkOAuthProviderWithAccessToken(
        providerID,
        accessToken
      )
    );
  }

  /**
   * Lists all active user sessions.
   */
  async listSessions(): Promise<Session[]> {
    return this.parent.apiClient.listSessions();
  }

  /**
   * Gets information on specified active user session.
   */
  async getSession(id: string): Promise<Session> {
    return this.parent.apiClient.getSession(id);
  }

  /**
   * Revokes the specified user session.
   *
   * @param id - Session ID
   */
  async revokeSession(id: string): Promise<void> {
    return this.parent.apiClient.revokeSession(id);
  }

  /**
   * Revokes all other active user sessions.
   */
  async revokeOtherSessions(): Promise<void> {
    return this.parent.apiClient.revokeOtherSessions();
  }
}

/**
 * Skygear Auth Multi-Factor-Authentication APIs.
 *
 * @public
 */
export class MFAContainer<T extends BaseAPIClient> {
  parent: AuthContainer<T>;

  constructor(parent: AuthContainer<T>) {
    this.parent = parent;
  }

  /**
   * Returns a list of MFA recovery code.
   *
   * @remarks
   * This feature must be enabled in configuration, otherwise it will fail.
   */
  async listRecoveryCode(): Promise<string[]> {
    return this.parent.parent.apiClient.listRecoveryCode();
  }

  /**
   * Regenerates MFA recovery codes.
   *
   * @returns The newly generated recovery codes
   */
  async regenerateRecoveryCode(): Promise<string[]> {
    return this.parent.parent.apiClient.regenerateRecoveryCode();
  }

  /**
   * Perform MFA using recovery code.
   *
   * @param code - MFA recovery code
   */
  async authenticateWithRecoveryCode(code: string): Promise<User> {
    return this.parent.handleAuthResponse(
      this.parent.parent.apiClient.authenticateWithRecoveryCode(code)
    );
  }

  /**
   * Returns a list of configured MFA authenticators.
   */
  async getAuthenticators(): Promise<Authenticator[]> {
    return this.parent.parent.apiClient.getAuthenticators();
  }

  /**
   * Delete the MFA authenticator with specified ID.
   *
   * @param id - Authenticator ID
   */
  async deleteAuthenticator(id: string): Promise<void> {
    return this.parent.parent.apiClient.deleteAuthenticator(id);
  }

  /**
   * Creates new time-based one time password (TOTP) MFA authenticator.
   *
   * @param options - TOTP configuration
   */
  async createNewTOTP(
    options: CreateNewTOTPOptions
  ): Promise<CreateNewTOTPResult> {
    return this.parent.parent.apiClient.createNewTOTP(options);
  }

  /**
   * Activates time-based one time password (TOTP) MFA authenticator.
   *
   * @param otp - TOTP code
   */
  async activateTOTP(otp: string): Promise<ActivateTOTPResult> {
    return this.parent.parent.apiClient.activateTOTP(otp);
  }

  /**
   * Perform MFA using time-based one time password (TOTP) MFA authenticator.
   *
   * @param options - Authentication options
   */
  async authenticateWithTOTP(
    options: AuthenticateWithTOTPOptions
  ): Promise<User> {
    return this.parent.handleAuthResponse(
      this.parent.parent.apiClient.authenticateWithTOTP(options)
    );
  }

  /**
   * Creates new out-of-band (OOB) MFA authenticator.
   *
   * @param options - OOB configuration
   */
  async createNewOOB(
    options: CreateNewOOBOptions
  ): Promise<CreateNewOOBResult> {
    return this.parent.parent.apiClient.createNewOOB(options);
  }

  /**
   * Activates out-of-band (OOB) MFA authenticator.
   *
   * @param code - MFA code
   */
  async activateOOB(code: string): Promise<ActivateOOBResult> {
    return this.parent.parent.apiClient.activateOOB(code);
  }

  /**
   * Triggers out-of-band (OOB) MFA.
   *
   * @param authenticatorID - Authenticator ID
   */
  async triggerOOB(authenticatorID?: string): Promise<void> {
    return this.parent.parent.apiClient.triggerOOB(authenticatorID);
  }

  /**
   * Performs MFA using out-of-band (OOB) MFA authenticator.
   *
   * @param options - Authentication options
   */
  async authenticateWithOOB(
    options: AuthenticateWithOOBOptions
  ): Promise<User> {
    return this.parent.handleAuthResponse(
      this.parent.parent.apiClient.authenticateWithOOB(options)
    );
  }

  /**
   * Revokes all MFA trusted devices.
   */
  async revokeAllTrustedDevices(): Promise<void> {
    await this.parent.parent.apiClient.revokeAllBearerToken();
  }
}

/**
 * Skygear APIs container.
 *
 * @remarks
 * This is the base class to Skygear APIs.
 * Consumers should use platform-specific containers instead.
 *
 * @public
 */
export class Container<T extends BaseAPIClient> {
  /**
   * Unique ID for this container.
   * @defaultValue "default"
   */
  name: string;
  apiClient: T;
  storage: ContainerStorage;
  auth: AuthContainer<T>;

  constructor(options: ContainerOptions<T>) {
    if (!options.apiClient) {
      throw Error("missing apiClient");
    }

    if (!options.storage) {
      throw Error("missing storage");
    }

    this.name = options.name || "default";
    this.apiClient = options.apiClient;
    this.storage = options.storage;
    this.auth = new AuthContainer(this);
  }

  /**
   * Configure this container with connection information.
   *
   * @param options - Skygear connection information
   */
  async configure(options: {
    apiKey: string;
    endpoint: string;
  }): Promise<void> {
    this.apiClient.apiKey = options.apiKey;
    this.apiClient.endpoint = _removeTrailingSlash(options.endpoint);

    const authenticationSession = await this.storage.getAuthenticationSession(
      this.name
    );
    this.apiClient._authenticationSession = authenticationSession;

    const accessToken = await this.storage.getAccessToken(this.name);
    this.apiClient._accessToken = accessToken;

    const user = await this.storage.getUser(this.name);
    this.auth.currentUser = user;

    const identity = await this.storage.getIdentity(this.name);
    this.auth.currentIdentity = identity;

    const sessionID = await this.storage.getSessionID(this.name);
    this.auth.currentSessionID = sessionID;

    const extraSessionInfoOptions = await this.storage.getExtraSessionInfoOptions(
      this.name
    );
    this.auth.extraSessionInfoOptions = {
      ...defaultExtraSessionInfoOptions,
      ...extraSessionInfoOptions,
    };

    this.apiClient.refreshTokenFunction = this.auth._refreshAccessToken.bind(
      this.auth
    );
    this.apiClient.getExtraSessionInfo = this.auth._getExtraSessionInfo.bind(
      this.auth
    );
  }

  /**
   * `fetch` function for calling microservice.
   *
   * @remarks
   * This function can be used same as the standard `fetch` function, except
   * it will attach Skygear authorization information (e.g. API key, access
   * token) to the request.
   */
  async fetch(input: string, init?: RequestInit): Promise<Response> {
    return this.apiClient.fetch(input, init);
  }
}
