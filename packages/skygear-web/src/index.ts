import { add } from "@skygear/core";

export function addSelf(a: number): number {
  return add(a, a);
}
