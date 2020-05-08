import { NativeModules, NativeEventEmitter } from "react-native";

const { SGSkygearReactNative } = NativeModules;

const SGSkygearReactNativeEmitter = new NativeEventEmitter(
  SGSkygearReactNative
);

export function randomBytes(length: number): Promise<number[]> {
  return SGSkygearReactNative.randomBytes(length);
}

export function sha256String(input: string): Promise<number[]> {
  return SGSkygearReactNative.sha256String(input);
}

export function openURL(url: string): Promise<void> {
  return SGSkygearReactNative.openURL(url);
}

export function openAuthorizeURL(
  url: string,
  callbackURLScheme: string
): Promise<string> {
  return SGSkygearReactNative.openAuthorizeURL(url, callbackURLScheme);
}

export function signInWithApple(
  url: string
): Promise<{ code: string; scope: string; state: string }> {
  return SGSkygearReactNative.signInWithApple(url);
}

export function getAnonymousKey(
  kid: string | null
): Promise<{ kid: string; alg: string; jwk?: any }> {
  return SGSkygearReactNative.getAnonymousKey(kid);
}

export function signAnonymousToken(
  kid: string,
  tokenData: string
): Promise<string> {
  return SGSkygearReactNative.signAnonymousToken(kid, tokenData);
}

/**
 * @public
 */
export function getCredentialStateForUserID(
  userID: string
): Promise<"Authorized" | "NotFound" | "Revoked" | "Transferred"> {
  return SGSkygearReactNative.getCredentialStateForUserID(userID);
}

/**
 * @public
 */
export function addAppleIDCredentialRevokedListener(
  listener: () => void
): { remove: () => void } {
  return SGSkygearReactNativeEmitter.addListener(
    "SGSkygearReactNativeAppleIDCredentialRevokedNotification",
    listener
  );
}
