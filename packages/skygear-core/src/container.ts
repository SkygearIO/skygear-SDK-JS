import {
  ContainerStorage,
  JSONObject,
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
} from "./types";
import { BaseAPIClient, _removeTrailingSlash, encodeQuery } from "./client";
import { SkygearError } from "./error";

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
 * @public
 */
export class AuthContainer<T extends BaseAPIClient> {
  parent: Container<T>;
  mfa: MFAContainer<T>;
  currentUser: User | null;
  currentIdentity: Identity | null;
  currentSessionID: string | null;
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
    const info: JSONObject = {};

    if (options.deviceName) {
      info["device_name"] = options.deviceName;
      hasInfo = true;
    }

    return hasInfo ? info : null;
  }

  async persistResponse(response: AuthResponse): Promise<void> {
    const { user, identity, accessToken, refreshToken, sessionID } = response;

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

  async signup(
    loginIDs: { [key: string]: string }[] | { [key: string]: string },
    password: string,
    options?: {
      realm?: string;
      metadata?: JSONObject;
    }
  ): Promise<User> {
    const response = await this.parent.apiClient.signup(
      loginIDs,
      password,
      options
    );
    await this.persistResponse(response);
    return response.user;
  }

  /**
   * signupWithEmail is a shorthand of {@link AuthContainer.signup | the signup() method}.
   */
  async signupWithEmail(
    email: string,
    password: string,
    options?: {
      realm?: string;
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
   * signupWithUsername is a shorthand of {@link AuthContainer.signup | the signup() method}.
   */
  async signupWithUsername(
    username: string,
    password: string,
    options?: {
      realm?: string;
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

  async login(
    loginID: string,
    password: string,
    options?: { loginIDKey?: string; realm?: string }
  ): Promise<User> {
    const response = await this.parent.apiClient.login(
      loginID,
      password,
      options
    );
    await this.persistResponse(response);
    return response.user;
  }

  async logout(): Promise<void> {
    await this.parent.apiClient.logout();
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
      if (error instanceof SkygearError && error.name === "NotAuthenticated") {
        // cannot refresh -> session is gone
        await this._clearSession();
      }
      throw error;
    }

    await this.parent.storage.setAccessToken(this.parent.name, accessToken);
    this.parent.apiClient._accessToken = accessToken;

    return true;
  }

  async me(): Promise<User> {
    const response = await this.parent.apiClient.me();
    await this.persistResponse(response);
    return response.user;
  }

  async changePassword(
    newPassword: string,
    oldPassword: string
  ): Promise<User> {
    const response = await this.parent.apiClient.changePassword(
      newPassword,
      oldPassword
    );
    await this.persistResponse(response);
    return response.user;
  }

  async updateMetadata(metadata: JSONObject): Promise<User> {
    const response = await this.parent.apiClient.updateMetadata(metadata);
    await this.persistResponse(response);
    return response.user;
  }

  async requestForgotPasswordEmail(email: string): Promise<void> {
    return this.parent.apiClient.requestForgotPasswordEmail(email);
  }

  async resetPassword(form: {
    userID: string;
    code: string;
    expireAt: number;
    newPassword: string;
  }): Promise<void> {
    return this.parent.apiClient.resetPassword(form);
  }

  async requestEmailVerification(email: string): Promise<void> {
    return this.parent.apiClient.requestEmailVerification(email);
  }

  async verifyWithCode(code: string): Promise<void> {
    return this.parent.apiClient.verifyWithCode(code);
  }

  async loginWithCustomToken(
    token: string,
    options?: SSOLoginOptions
  ): Promise<User> {
    const response = await this.parent.apiClient.loginWithCustomToken(
      token,
      options
    );
    await this.persistResponse(response);
    return response.user;
  }

  async deleteOAuthProvider(providerID: string): Promise<void> {
    return this.parent.apiClient.deleteOAuthProvider(providerID);
  }

  async loginOAuthProviderWithAccessToken(
    providerID: string,
    accessToken: string,
    options?: SSOLoginOptions
  ): Promise<User> {
    const response = await this.parent.apiClient.loginOAuthProviderWithAccessToken(
      providerID,
      accessToken,
      options
    );
    await this.persistResponse(response);
    return response.user;
  }

  async linkOAuthProviderWithAccessToken(
    providerID: string,
    accessToken: string
  ): Promise<User> {
    const response = await this.parent.apiClient.linkOAuthProviderWithAccessToken(
      providerID,
      accessToken
    );
    await this.persistResponse(response);
    return response.user;
  }

  async listSessions(): Promise<Session[]> {
    return this.parent.apiClient.listSessions();
  }

  async getSession(id: string): Promise<Session> {
    return this.parent.apiClient.getSession(id);
  }

  async revokeSession(id: string): Promise<void> {
    return this.parent.apiClient.revokeSession(id);
  }

  async revokeOtherSessions(): Promise<void> {
    return this.parent.apiClient.revokeOtherSessions();
  }
}

/**
 * @public
 */
export class MFAContainer<T extends BaseAPIClient> {
  parent: AuthContainer<T>;

  constructor(parent: AuthContainer<T>) {
    this.parent = parent;
  }

  async listRecoveryCode(): Promise<string[]> {
    return this.parent.parent.apiClient.listRecoveryCode();
  }

  async regenerateRecoveryCode(): Promise<string[]> {
    return this.parent.parent.apiClient.regenerateRecoveryCode();
  }

  async authenticateWithRecoveryCode(code: string): Promise<User> {
    const response = await this.parent.parent.apiClient.authenticateWithRecoveryCode(
      code
    );
    await this.parent.persistResponse(response);
    return response.user;
  }

  async getAuthenticators(): Promise<Authenticator[]> {
    return this.parent.parent.apiClient.getAuthenticators();
  }

  async deleteAuthenticator(id: string): Promise<void> {
    return this.parent.parent.apiClient.deleteAuthenticator(id);
  }

  generateOTPAuthURIQRCodeImageURL(otpauthURI: string): string {
    return (
      this.parent.parent.apiClient.endpoint +
      "/_auth/mfa/totp/qrcode" +
      encodeQuery([["otpauth_uri", otpauthURI]])
    );
  }

  async createNewTOTP(
    options: CreateNewTOTPOptions
  ): Promise<CreateNewTOTPResult> {
    const { displayName, issuer, accountName } = options;
    const {
      authenticatorID,
      authenticatorType,
      secret,
    } = await this.parent.parent.apiClient.createNewTOTP(displayName);
    const otpauthURI = generateOTPAuthURI({
      secret,
      issuer,
      accountName,
    });
    const qrCodeImageURL = this.generateOTPAuthURIQRCodeImageURL(otpauthURI);
    return {
      authenticatorID,
      authenticatorType,
      secret,
      otpauthURI,
      qrCodeImageURL,
    };
  }

  async activateTOTP(otp: string): Promise<ActivateTOTPResult> {
    return this.parent.parent.apiClient.activateTOTP(otp);
  }

  async authenticateWithTOTP(
    options: AuthenticateWithTOTPOptions
  ): Promise<User> {
    const response = await this.parent.parent.apiClient.authenticateWithTOTP(
      options
    );
    await this.parent.persistResponse(response);
    return response.user;
  }

  async createNewOOB(
    options: CreateNewOOBOptions
  ): Promise<CreateNewOOBResult> {
    return this.parent.parent.apiClient.createNewOOB(options);
  }

  async activateOOB(code: string): Promise<ActivateOOBResult> {
    return this.parent.parent.apiClient.activateOOB(code);
  }

  // TODO(mfa): Trigger, Authenticate OOB.
  // TODO(mfa): Revoke all bearer token.
  // TODO(mfa): Support bearer token transparently.
}

/**
 * @public
 */
export class Container<T extends BaseAPIClient> {
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

  async configure(options: {
    apiKey: string;
    endpoint: string;
  }): Promise<void> {
    this.apiClient.apiKey = options.apiKey;
    this.apiClient.endpoint = _removeTrailingSlash(options.endpoint);

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

  async fetch(input: string, init?: RequestInit): Promise<Response> {
    return this.apiClient.fetch(input, init);
  }
}
