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

export function openURL(
  url: string,
  callbackURLScheme: string
): Promise<string> {
  return SGSkygearReactNative.openURL(url, callbackURLScheme);
}

export function signInWithApple(
  url: string
): Promise<{ code: string; scope: string; state: string }> {
  return SGSkygearReactNative.signInWithApple(url);
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
