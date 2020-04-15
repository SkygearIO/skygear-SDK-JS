import { Platform } from "react-native";
import { parseSemver } from "./version";

export function getResponseMode(): string | undefined {
  // for ios version < 13.4, set response mode to query_html_redirect
  // to work around ios bug
  // related issue: https://github.com/SkygearIO/skygear-server/issues/1334
  if (Platform.OS === "ios") {
    const v = parseSemver(Platform.Version as string);
    if (v && v.major <= 13 && v.minor < 4) {
      return "query_html_redirect";
    }
  }
  return undefined;
}
