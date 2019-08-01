import { JSONObject } from "./types";

/**
 * @public
 */
export const SkygearErrorCodeNotAuthenticated = 101 as const;
/**
 * @public
 */
export const SkygearErrorCodePermissionDenied = 102 as const;
/**
 * @public
 */
export const SkygearErrorCodeAccessKeyNotAccepted = 103 as const;
/**
 * @public
 */
export const SkygearErrorCodeAccessTokenNotAccepted = 104 as const;
/**
 * @public
 */
export const SkygearErrorCodeInvalidCredentials = 105 as const;
/**
 * @public
 */
export const SkygearErrorCodeInvalidSignature = 106 as const;
/**
 * @public
 */
export const SkygearErrorCodeBadRequest = 107 as const;
/**
 * @public
 */
export const SkygearErrorCodeInvalidArgument = 108 as const;
/**
 * @public
 */
export const SkygearErrorCodeDuplicated = 109 as const;
/**
 * @public
 */
export const SkygearErrorCodeResourceNotFound = 110 as const;
/**
 * @public
 */
export const SkygearErrorCodeNotSupported = 111 as const;
/**
 * @public
 */
export const SkygearErrorCodeNotImplemented = 112 as const;
/**
 * @public
 */
export const SkygearErrorCodeConstraintViolated = 113 as const;
/**
 * @public
 */
export const SkygearErrorCodeIncompatibleSchema = 114 as const;
/**
 * @public
 */
export const SkygearErrorCodeAtomicOperationFailure = 115 as const;
/**
 * @public
 */
export const SkygearErrorCodePartialOperationFailure = 116 as const;
/**
 * @public
 */
export const SkygearErrorCodeUndefinedOperation = 117 as const;
/**
 * @public
 */
export const SkygearErrorCodePluginUnavailable = 118 as const;
/**
 * @public
 */
export const SkygearErrorCodePluginTimeout = 119 as const;
/**
 * @public
 */
export const SkygearErrorCodeRecordQueryInvalid = 120 as const;
/**
 * @public
 */
export const SkygearErrorCodePluginInitializing = 121 as const;
/**
 * @public
 */
export const SkygearErrorCodeResponseTimeout = 122 as const;
/**
 * @public
 */
export const SkygearErrorCodeDeniedArgument = 123 as const;
/**
 * @public
 */
export const SkygearErrorCodeRecordQueryDenied = 124 as const;
/**
 * @public
 */
export const SkygearErrorCodeNotConfigured = 125 as const;
/**
 * @public
 */
export const SkygearErrorCodePasswordPolicyViolated = 126 as const;
/**
 * @public
 */
export const SkygearErrorCodeUserDisabled = 127 as const;
/**
 * @public
 */
export const SkygearErrorCodeVerificationRequired = 128 as const;
/**
 * @public
 */
export const SkygearErrorCodeAssetSizeTooLarge = 129 as const;
/**
 * @public
 */
export const SkygearErrorCodeHookTimeOut = 130 as const;

/**
 * @public
 */
export const SkygearErrorCodeUnexpectedError = 10000 as const;
/**
 * @public
 */
export const SkygearErrorCodeUnexpectedAuthInfoNotFound = 10001 as const;
/**
 * @public
 */
export const SkygearErrorCodeUnexpectedUnableToOpenDatabase = 10002 as const;
/**
 * @public
 */
export const SkygearErrorCodeUnexpectedUserNotFound = 10005 as const;

/**
 * @public
 */
export type SkygearErrorCode =
  | typeof SkygearErrorCodeNotAuthenticated
  | typeof SkygearErrorCodePermissionDenied
  | typeof SkygearErrorCodeAccessKeyNotAccepted
  | typeof SkygearErrorCodeAccessTokenNotAccepted
  | typeof SkygearErrorCodeInvalidCredentials
  | typeof SkygearErrorCodeInvalidSignature
  | typeof SkygearErrorCodeBadRequest
  | typeof SkygearErrorCodeInvalidArgument
  | typeof SkygearErrorCodeDuplicated
  | typeof SkygearErrorCodeResourceNotFound
  | typeof SkygearErrorCodeNotSupported
  | typeof SkygearErrorCodeNotImplemented
  | typeof SkygearErrorCodeConstraintViolated
  | typeof SkygearErrorCodeIncompatibleSchema
  | typeof SkygearErrorCodeAtomicOperationFailure
  | typeof SkygearErrorCodePartialOperationFailure
  | typeof SkygearErrorCodeUndefinedOperation
  | typeof SkygearErrorCodePluginUnavailable
  | typeof SkygearErrorCodePluginTimeout
  | typeof SkygearErrorCodeRecordQueryInvalid
  | typeof SkygearErrorCodePluginInitializing
  | typeof SkygearErrorCodeResponseTimeout
  | typeof SkygearErrorCodeDeniedArgument
  | typeof SkygearErrorCodeRecordQueryDenied
  | typeof SkygearErrorCodeNotConfigured
  | typeof SkygearErrorCodePasswordPolicyViolated
  | typeof SkygearErrorCodeUserDisabled
  | typeof SkygearErrorCodeVerificationRequired
  | typeof SkygearErrorCodeAssetSizeTooLarge
  | typeof SkygearErrorCodeHookTimeOut;

/**
 * @public
 */
export class SkygearError extends Error {
  code: SkygearErrorCode;
  name: string;
  info?: JSONObject;

  constructor(
    code: SkygearErrorCode,
    message: string,
    name: string,
    info?: JSONObject
  ) {
    super(message);
    this.code = code;
    this.name = name;
    this.info = info;
  }
}

/**
 * @public
 */
export function decodeError(err?: any): Error {
  if (
    err &&
    typeof err.code === "number" &&
    typeof err.name === "string" &&
    typeof err.message === "string"
  ) {
    throw new SkygearError(err.code, err.message, err.name, err.info);
  }
  // TODO: Should we throw a better error?
  throw new Error("unknown error");
}
