import { JSONObject, AuthenticationSession } from "./types";

/**
 * @public
 */
export const SkygearErrorNames = {
  BadRequest: "BadRequest",
  Invalid: "Invalid",
  Unauthorized: "Unauthorized",
  Forbidden: "Forbidden",
  NotFound: "NotFound",
  AlreadyExists: "AlreadyExists",
  TooManyRequest: "TooManyRequest",
  InternalError: "InternalError",
  ServiceUnavailable: "ServiceUnavailable",
} as const;

/**
 * @public
 */
export type SkygearErrorName = (typeof SkygearErrorNames)[keyof (typeof SkygearErrorNames)];

/**
 * Skygear API error.
 *
 * @remarks
 * All Skygear APIs (e.g. Auth, Asset) functions would throw errors of this
 * type if server returns failure.
 *
 * @public
 */
export class SkygearError extends Error {
  /**
   * Error name.
   *
   * @remarks
   * See {@link SkygearErrorNames} for possible values.
   * New error names may be added in future.
   */
  name: string;
  /**
   * Error message.
   *
   * @remarks
   * Error messages are provided for convenience, and not stable APIs;
   * Consumers should use {@link SkygearError.name} or
   * {@link SkygearError.reason} to distinguish between different errors.
   */
  message!: string;
  /**
   * Error reason.
   */
  reason: string;
  /**
   * Additional error information.
   */
  info?: JSONObject;

  constructor(
    message: string,
    name: string,
    reason: string,
    info?: JSONObject
  ) {
    super(message);
    this.name = name;
    this.reason = reason;
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
    typeof err.reason === "string" &&
    typeof err.message === "string"
  ) {
    return new SkygearError(err.message, err.name, err.reason, err.info);
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

/**
 * @internal
 */
export function _extractAuthenticationSession(
  e: unknown
): AuthenticationSession | null {
  if (
    e instanceof SkygearError &&
    e.reason === "AuthenticationSession" &&
    e.info != null
  ) {
    const { token, step } = e.info as any;
    return {
      token,
      step,
    } as AuthenticationSession;
  }
  return null;
}

/**
 * Check if the provided error indicates Multi-Factor-Authentication is
 * required during authentication.
 *
 * @remarks
 * The error may be thrown when attempting to login/signup if configured.
 *
 * @public
 */
export function isMFARequiredError(e: unknown): boolean {
  const authenticationSession = _extractAuthenticationSession(e);
  return authenticationSession != null && authenticationSession.step === "mfa";
}
