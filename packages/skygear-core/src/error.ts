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
 * CancelError is an error to represent cancel.
 *
 * @public
 */
export class CancelError extends Error {}

/**
 * CANCEL is sentinel value for cancel.
 *
 * @public
 */
export const CANCEL = new CancelError();

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
  info?: unknown;

  constructor(message: string, name: string, reason: string, info?: unknown) {
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
