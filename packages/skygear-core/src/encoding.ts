import { User, Identity, JSONObject } from "./types";

export function decodeUser(u: any): User {
  const id = u.id;
  const createdAt = new Date(u.created_at);
  const lastLoginAt = new Date(u.last_login_at);
  const isVerified = u.is_verified;
  const isDisabled = u.is_disabled;
  const metadata = u.metadata;
  return {
    id,
    createdAt,
    lastLoginAt,
    isVerified,
    isDisabled,
    metadata,
  };
}

export function decodeIdentity(i: any): Identity {
  const id = i.id;
  const type = i.type;
  switch (type) {
    case "password":
      return {
        id,
        type: "password",
        loginIDKey: i.login_id_key,
        loginID: i.login_id,
        realm: i.realm,
        claims: i.claims,
      };
    case "oauth":
      return {
        id,
        type: "oauth",
        providerType: i.provider_type,
        providerUserID: i.provider_user_id,
        rawProfile: i.raw_profile,
        claims: i.claims,
      };
    case "custom_token":
      return {
        id,
        type: "custom_token",
        providerUserID: i.provider_user_id,
        rawProfile: i.raw_profile,
        claims: i.claims,
      };
    default:
      throw new Error("unknown identity type: " + type);
  }
}

export function encodeUser(u: User): JSONObject {
  const created_at = u.createdAt.toISOString();
  const last_login_at = u.lastLoginAt.toISOString();
  return {
    id: u.id,
    created_at,
    last_login_at,
    is_verified: u.isVerified,
    is_disabled: u.isDisabled,
    metadata: u.metadata,
  };
}

export function encodeIdentity(i: Identity): JSONObject {
  switch (i.type) {
    case "password":
      return {
        id: i.id,
        type: "password",
        login_id_key: i.loginIDKey,
        login_id: i.loginID,
        realm: i.realm,
        claims: i.claims as any,
      };
    case "oauth":
      return {
        id: i.id,
        type: "oauth",
        provider_type: i.providerType,
        provider_user_id: i.providerUserID,
        raw_profile: i.rawProfile,
        claims: i.claims as any,
      };
    case "custom_token":
      return {
        id: i.id,
        type: "custom_token",
        provider_user_id: i.providerUserID,
        raw_profile: i.rawProfile,
        claims: i.claims as any,
      };
    default:
      throw new Error("unknown identity type: ");
  }
}
