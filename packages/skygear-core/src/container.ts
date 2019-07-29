import {
  JSONObject,
  User,
  Identity,
  AuthResponse,
  SSOLoginOptions,
} from "./types";
import { ContainerStorage } from "./storage";
import { BaseAPIClient } from "./client";
import {
  encodeUser,
  encodeIdentity,
  decodeUser,
  decodeIdentity,
} from "./encoding";

function keyAccessToken(name: string): string {
  return `${name}_accessToken`;
}

function keyUser(name: string): string {
  return `${name}_user`;
}

function keyIdentity(name: string): string {
  return `${name}_identity`;
}

/**
 * @public
 */
export class AuthContainer<T extends BaseAPIClient> {
  parent: Container<T>;
  currentUser: User | null;
  currentIdentity: Identity | null;

  constructor(parent: Container<T>) {
    this.parent = parent;
    this.currentUser = null;
    this.currentIdentity = null;
  }

  // @ts-ignore
  get accessToken(): string | null {
    return this.parent.apiClient.accessToken;
  }

  async persistResponse(response: AuthResponse): Promise<void> {
    const { user, identity, accessToken } = response;

    const userJSON = encodeUser(user);
    await this.parent.storage.safeSetJSON(keyUser(this.parent.name), userJSON);

    if (identity) {
      const identityJSON = encodeIdentity(identity);
      await this.parent.storage.safeSetJSON(
        keyIdentity(this.parent.name),
        identityJSON
      );
    }

    if (accessToken) {
      await this.parent.storage.safeSet(
        keyAccessToken(this.parent.name),
        accessToken
      );
    }

    this.currentUser = user;
    if (identity) {
      this.currentIdentity = identity;
    }
    if (accessToken) {
      this.parent.apiClient.accessToken = accessToken;
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
    await this.parent.storage.safeDel(keyAccessToken(this.parent.name));
    await this.parent.storage.safeDel(keyIdentity(this.parent.name));
    await this.parent.storage.safeDel(keyUser(this.parent.name));
    this.currentUser = null;
    this.currentIdentity = null;
    this.parent.apiClient.accessToken = null;
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
}

/**
 * @public
 */
export class Container<T extends BaseAPIClient> {
  name: string;
  apiClient: T;
  storage: ContainerStorage;
  auth: AuthContainer<T>;

  constructor(name: string, apiClient: T, storage: ContainerStorage) {
    this.name = name;
    this.apiClient = apiClient;
    this.storage = storage;
    this.auth = new AuthContainer(this);
  }

  async configure(options: {
    apiKey: string;
    endpoint: string;
  }): Promise<void> {
    this.apiClient.apiKey = options.apiKey;
    this.apiClient.endpoint = options.endpoint;

    const accessToken = await this.storage.safeGet(keyAccessToken(this.name));
    this.apiClient.accessToken = accessToken;

    const userJSON = await this.storage.safeGetJSON(keyUser(this.name));
    if (userJSON) {
      const user = decodeUser(userJSON);
      this.auth.currentUser = user;
    } else {
      this.auth.currentUser = null;
    }

    const identityJSON = await this.storage.safeGetJSON(keyIdentity(this.name));
    if (identityJSON) {
      const identity = decodeIdentity(identityJSON);
      this.auth.currentIdentity = identity;
    } else {
      this.auth.currentIdentity = null;
    }
  }
}
