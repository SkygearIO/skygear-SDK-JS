import { JSONObject } from "./types";

/**
 * @public
 */
export const SkygearErrorNameUnexpectedError = "UnexpectedError" as const;
/**
 * @public
 */
export const SkygearErrorNameNotAuthenticated = "NotAuthenticated" as const;
/**
 * @public
 */
export const SkygearErrorNamePermissionDenied = "PermissionDenied" as const;
/**
 * @public
 */
export const SkygearErrorNameAccessKeyNotAccepted = "AccessKeyNotAccepted" as const;
/**
 * @public
 */
export const SkygearErrorNameAccessTokenNotAccepted = "AccessTokenNotAccepted" as const;
/**
 * @public
 */
export const SkygearErrorNameInvalidCredentials = "InvalidCredentials" as const;
/**
 * @public
 */
export const SkygearErrorNameBadRequest = "BadRequest" as const;
/**
 * @public
 */
export const SkygearErrorNameInvalidArgument = "InvalidArgument" as const;
/**
 * @public
 */
export const SkygearErrorNameDuplicated = "Duplicated" as const;
/**
 * @public
 */
export const SkygearErrorNameResourceNotFound = "ResourceNotFound" as const;
/**
 * @public
 */
export const SkygearErrorNameUndefinedOperation = "UndefinedOperation" as const;
/**
 * @public
 */
export const SkygearErrorNamePasswordPolicyViolated = "PasswordPolicyViolated" as const;
/**
 * @public
 */
export const SkygearErrorNameUserDisabled = "UserDisabled" as const;
/**
 * @public
 */
export const SkygearErrorNameVerificationRequired = "VerificationRequired" as const;
/**
 * @public
 */
export const SkygearErrorNameWebHookTimeOut = "WebHookTimeOut" as const;
/**
 * @public
 */
export const SkygearErrorNameWebHookFailed = "WebHookFailed" as const;
/**
 * @public
 */
export const SkygearErrorNameCurrentIdentityBeingDeleted = "CurrentIdentityBeingDeleted" as const;

/**
 * @public
 */
export type SkygearErrorName =
  | typeof SkygearErrorNameUnexpectedError
  | typeof SkygearErrorNameNotAuthenticated
  | typeof SkygearErrorNamePermissionDenied
  | typeof SkygearErrorNameAccessKeyNotAccepted
  | typeof SkygearErrorNameAccessTokenNotAccepted
  | typeof SkygearErrorNameInvalidCredentials
  | typeof SkygearErrorNameBadRequest
  | typeof SkygearErrorNameInvalidArgument
  | typeof SkygearErrorNameDuplicated
  | typeof SkygearErrorNameResourceNotFound
  | typeof SkygearErrorNameUndefinedOperation
  | typeof SkygearErrorNamePasswordPolicyViolated
  | typeof SkygearErrorNameUserDisabled
  | typeof SkygearErrorNameVerificationRequired
  | typeof SkygearErrorNameWebHookTimeOut
  | typeof SkygearErrorNameWebHookFailed
  | typeof SkygearErrorNameCurrentIdentityBeingDeleted;

/**
 * @public
 */
export class SkygearError extends Error {
  info?: JSONObject;

  constructor(message: string, name: string, info?: JSONObject) {
    super(message);
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/name
    this.name = name;
    this.info = info;
  }
}

/**
 * @public
 */
export function decodeError(err?: any): Error {
  // Construct SkygearError if it looks like one.
  if (
    err != null &&
    !(err instanceof Error) &&
    typeof err.name === "string" &&
    typeof err.message === "string"
  ) {
    return new SkygearError(err.message, err.name, err.info);
  }
  // If it is an Error, just return it.
  if (err instanceof Error) {
    return err;
  }
  // If it has message, construct an Error from the message.
  if (err != null && typeof err.message === "string") {
    return new Error(err.message);
  }
  // If it can be turned into string, use it as message.
  if (err != null && typeof err.toString === "function") {
    return new Error(err.toString());
  }
  // Otherwise cast it to string and use it as message.
  return new Error(String(err));
}
