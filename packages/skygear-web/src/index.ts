import { add } from "@skygear/core";

export { add };

export function addSelf(a: number): number {
  return add(a, a);
}

export async function useFeatures(): Promise<void> {
  for (const b of [1, 2, 3]) {
    console.log(b);
  }
  const objA = {};
  const objB = {};
  const objC = {
    ...objA,
    ...objB,
    c: "c",
  };
  console.log(objC);
  await useFeatures();
  await useFeatures();
  return Promise.reject(new Error("unreachable"));
}
