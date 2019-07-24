import { JSONObject } from "./types";

export class SkygearError extends Error {
  // TODO: Make error code a union type.
  code: number;
  name: string;
  info?: JSONObject;

  constructor(code: number, message: string, name: string, info?: JSONObject) {
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
