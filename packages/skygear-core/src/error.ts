import { JSONObject } from "./types";

export const SkygearErrorCodeNotAuthenticated = 101 as const;
export const SkygearErrorCodePermissionDenied = 102 as const;
export const SkygearErrorCodeAccessKeyNotAccepted = 103 as const;
export const SkygearErrorCodeAccessTokenNotAccepted = 104 as const;
export const SkygearErrorCodeInvalidCredentials = 105 as const;
export const SkygearErrorCodeInvalidSignature = 106 as const;
export const SkygearErrorCodeBadRequest = 107 as const;
export const SkygearErrorCodeInvalidArgument = 108 as const;
export const SkygearErrorCodeDuplicated = 109 as const;
export const SkygearErrorCodeResourceNotFound = 110 as const;
export const SkygearErrorCodeNotSupported = 111 as const;
export const SkygearErrorCodeNotImplemented = 112 as const;
export const SkygearErrorCodeConstraintViolated = 113 as const;
export const SkygearErrorCodeIncompatibleSchema = 114 as const;
export const SkygearErrorCodeAtomicOperationFailure = 115 as const;
export const SkygearErrorCodePartialOperationFailure = 116 as const;
export const SkygearErrorCodeUndefinedOperation = 117 as const;
export const SkygearErrorCodePluginUnavailable = 118 as const;
export const SkygearErrorCodePluginTimeout = 119 as const;
export const SkygearErrorCodeRecordQueryInvalid = 120 as const;
export const SkygearErrorCodePluginInitializing = 121 as const;
export const SkygearErrorCodeResponseTimeout = 122 as const;
export const SkygearErrorCodeDeniedArgument = 123 as const;
export const SkygearErrorCodeRecordQueryDenied = 124 as const;
export const SkygearErrorCodeNotConfigured = 125 as const;
export const SkygearErrorCodePasswordPolicyViolated = 126 as const;
export const SkygearErrorCodeUserDisabled = 127 as const;
export const SkygearErrorCodeVerificationRequired = 128 as const;
export const SkygearErrorCodeAssetSizeTooLarge = 129 as const;
export const SkygearErrorCodeHookTimeOut = 130 as const;

export const SkygearErrorCodeUnexpectedError = 10000 as const;
export const SkygearErrorCodeUnexpectedAuthInfoNotFound = 10001 as const;
export const SkygearErrorCodeUnexpectedUnableToOpenDatabase = 10002 as const;
export const SkygearErrorCodeUnexpectedUserNotFound = 10005 as const;

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

export class SkygearError extends Error {
  code: SkygearError;
  name: string;
  info?: JSONObject;

  constructor(
    code: SkygearError,
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
