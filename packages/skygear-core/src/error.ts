import { JSONObject } from "./types";

/**
 * @public
 */
export type SkygearErrorName =
  | "NotAuthenticated"
  | "PermissionDenied"
  | "AccessKeyNotAccepted"
  | "AccessTokenNotAccepted"
  | "InvalidCredentials"
  | "BadRequest"
  | "InvalidArgument"
  | "Duplicated"
  | "ResourceNotFound"
  | "UndefinedOperation"
  | "PasswordPolicyViolated"
  | "UserDisabled"
  | "VerificationRequired"
  | "WebHookTimeOut"
  | "WebHookFailed"
  | "CurrentIdentityBeingDeleted";

/**
 * @public
 */
export class SkygearError extends Error {
  // Ideally it is SkygearErrorName
  // but the server can emit unrecognized errors.
  name: string;
  info?: JSONObject;

  constructor(message: string, name: string, info?: JSONObject) {
    super(message);
    this.name = name;
    this.info = info;
  }
}

/**
 * @public
 */
export function decodeError(err?: any): Error {
  if (err && typeof err.name === "string" && typeof err.message === "string") {
    return new SkygearError(err.message, err.name, err.info);
  }
  // TODO: Should we throw a better error?
  return new Error("unknown error");
}
