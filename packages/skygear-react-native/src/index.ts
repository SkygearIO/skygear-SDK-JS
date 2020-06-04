import AsyncStorage from "@react-native-community/async-storage";
import {
  AuthContainer,
  BaseAPIClient,
  Container,
  ContainerOptions,
  GlobalJSONContainerStorage,
  StorageDriver,
  User,
  OIDCContainer,
  AuthorizeOptions,
  PromoteOptions,
} from "@skygear/core";
import { generateCodeVerifier, computeCodeChallenge } from "./pkce";
import { openURL, openAuthorizeURL } from "./nativemodule";
import { getCallbackURLScheme } from "./url";
import { getAnonymousJWK, signAnonymousJWT } from "./jwt";
export * from "@skygear/core";

const globalFetch = fetch;

/**
 * @public
 */
export class ReactNativeAPIClient extends BaseAPIClient {
  fetchFunction = globalFetch;
  requestClass = Request;
}

/**
 * @public
 */
export class ReactNativeAsyncStorageStorageDriver implements StorageDriver {
  get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }
  set(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  }
  del(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  }
}

/**
 * Skygear OIDC APIs (for React Native).
 *
 * @public
 */
export class ReactNativeOIDCContainer<
  T extends ReactNativeAPIClient
> extends OIDCContainer<T> {
  clientID: string;
  isThirdParty: boolean;

  constructor(
    parent: ReactNativeContainer<T>,
    auth: ReactNativeAuthContainer<T>
  ) {
    super(parent, auth);
    this.clientID = "";
    this.isThirdParty = true;
  }

  async _setupCodeVerifier() {
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await computeCodeChallenge(codeVerifier);
    return {
      verifier: codeVerifier,
      challenge: codeChallenge,
    };
  }

  /**
   * Open authorize page
   *
   * @param options - authorize options
   */
  async authorize(
    options: AuthorizeOptions
  ): Promise<{ user: User; state?: string }> {
    const redirectURIScheme = getCallbackURLScheme(options.redirectURI);
    const authorizeURL = await this.authorizeEndpoint(options);
    const redirectURL = await openAuthorizeURL(authorizeURL, redirectURIScheme);
    return this._finishAuthorization(redirectURL);
  }

  /**
   * Open the URL with the user agent that is used to perform authentication.
   */
  async openURL(url: string): Promise<void> {
    await openURL(url);
  }

  /**
   * Logout.
   *
   * @remarks
   * If `force` parameter is set to `true`, all potential errors (e.g. network
   * error) would be ignored.
   *
   * @param options - Logout options
   */
  async logout(
    options: {
      force?: boolean;
    } = {}
  ): Promise<void> {
    return this._logout(options);
  }

  /**
   * Authenticate as an anonymous user.
   */
  async authenticateAnonymously(): Promise<{ user: User }> {
    const { token } = await this.parent.apiClient.oauthChallenge(
      "anonymous_request"
    );

    const keyID = await this.parent.storage.getAnonymousKeyID(this.parent.name);
    const key = await getAnonymousJWK(keyID);

    const now = Math.floor(+new Date() / 1000);
    const header = { typ: "vnd.skygear.auth.anonymous-request", ...key };
    const payload = {
      iat: +now,
      exp: +now + 60,
      challenge: token,
      action: "auth",
    };
    const jwt = await signAnonymousJWT(key.kid, header, payload);

    const tokenResponse = await this.parent.apiClient._oidcTokenRequest({
      grant_type: "urn:skygear-auth:params:oauth:grant-type:anonymous-request",
      client_id: this.parent.apiClient.apiKey,
      jwt,
    });

    const authResponse = await this.parent.apiClient._oidcUserInfoRequest(
      tokenResponse.access_token
    );
    const ar = { ...authResponse };
    ar.accessToken = tokenResponse.access_token;
    ar.refreshToken = tokenResponse.refresh_token;
    ar.expiresIn = tokenResponse.expires_in;
    await this.auth.persistAuthResponse(ar);

    await this.parent.storage.setAnonymousKeyID(this.parent.name, key.kid);
    return { user: authResponse.user };
  }

  /**
   * Open promote anonymous user page
   *
   * @param options - promote options
   */
  async promoteAnonymousUser(
    options: PromoteOptions
  ): Promise<{ user: User; state?: string }> {
    const keyID = await this.parent.storage.getAnonymousKeyID(this.parent.name);
    if (!keyID) {
      throw new Error("anonymous user credentials not found");
    }
    const key = await getAnonymousJWK(keyID);

    const { token } = await this.parent.apiClient.oauthChallenge(
      "anonymous_request"
    );

    const now = Math.floor(+new Date() / 1000);
    const header = { typ: "vnd.skygear.auth.anonymous-request", ...key };
    const payload = {
      iat: +now,
      exp: +now + 60,
      challenge: token,
      action: "promote",
    };
    const jwt = await signAnonymousJWT(key.kid, header, payload);
    const loginHint = `https://auth.skygear.io/login_hint?type=anonymous&jwt=${encodeURIComponent(
      jwt
    )}`;

    const redirectURIScheme = getCallbackURLScheme(options.redirectURI);
    const authorizeURL = await this.authorizeEndpoint({
      ...options,
      prompt: "login",
      loginHint,
    });
    const redirectURL = await openAuthorizeURL(authorizeURL, redirectURIScheme);
    const result = await this._finishAuthorization(redirectURL);

    await this.parent.storage.delAnonymousKeyID(this.parent.name);
    return result;
  }
}

/**
 * Skygear Auth APIs (for React Native).
 *
 * @public
 */
export class ReactNativeAuthContainer<
  T extends ReactNativeAPIClient
> extends AuthContainer<T> {}

/**
 * @public
 */
export interface ConfigureOptions {
  /**
   * The OAuth client ID.
   */
  clientID: string;
  /**
   * The app endpoint.
   */
  appEndpoint: string;
  /**
   * The Skygear Auth endpoint. If it is omitted, it is derived by pre-pending `accounts.` to the domain of the app endpoint.
   */
  authEndpoint?: string;
}

/**
 * Skygear APIs container (for React Native).
 *
 * @public
 */
export class ReactNativeContainer<
  T extends ReactNativeAPIClient
> extends Container<T> {
  auth: ReactNativeOIDCContainer<T>;

  constructor(options?: ContainerOptions<T>) {
    const o = {
      ...options,
      apiClient: (options && options.apiClient) || new ReactNativeAPIClient(),
      storage:
        (options && options.storage) ||
        new GlobalJSONContainerStorage(
          new ReactNativeAsyncStorageStorageDriver()
        ),
    } as ContainerOptions<T>;

    super(o);
    this.auth = new ReactNativeOIDCContainer(
      this,
      new ReactNativeAuthContainer(this)
    );
  }

  /**
   * Configure this container with connection information.
   *
   * @param options - Skygear connection information
   */
  async configure(options: ConfigureOptions) {
    await this._configure({
      apiKey: options.clientID,
      endpoint: options.appEndpoint,
      authEndpoint: options.authEndpoint,
    });
    this.auth.clientID = options.clientID;
  }
}

/**
 * Default Skygear APIs container.
 *
 * @remarks
 * This is a global shared container, provided for convenience.
 *
 * @public
 */
const defaultContainer: ReactNativeContainer<
  ReactNativeAPIClient
> = new ReactNativeContainer();

export default defaultContainer;
