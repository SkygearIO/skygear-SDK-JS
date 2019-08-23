import {
  JSONObject,
  User,
  Identity,
  AuthResponse,
  SSOLoginOptions,
} from "./types";
import { ContainerStorage } from "./storage";
import { BaseAPIClient } from "./client";

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

    await this.parent.storage.setUser(this.parent.name, user);

    if (identity) {
      await this.parent.storage.setIdentity(this.parent.name, identity);
    }

    if (accessToken) {
      await this.parent.storage.setAccessToken(this.parent.name, accessToken);
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
    await this.parent.storage.delUser(this.parent.name);
    await this.parent.storage.delIdentity(this.parent.name);
    await this.parent.storage.delAccessToken(this.parent.name);
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

    const accessToken = await this.storage.getAccessToken(this.name);
    this.apiClient.accessToken = accessToken;

    const user = await this.storage.getUser(this.name);
    this.auth.currentUser = user;

    const identity = await this.storage.getIdentity(this.name);
    this.auth.currentIdentity = identity;
  }

  async fetch(input: string, init?: RequestInit): Promise<Response> {
    return this.apiClient.fetch(input, init);
  }
}
