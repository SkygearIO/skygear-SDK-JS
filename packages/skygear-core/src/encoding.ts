import {
  User,
  Identity,
  Session,
  SessionUserAgent,
  JSONObject,
  AuthResponse,
  ExtraSessionInfoOptions,
  Authenticator,
} from "./types";

/**
 * @public
 */
export function decodeAuthResponse(r: any): AuthResponse {
  const { user, identity, access_token, refresh_token, session_id } = r;
  const response: AuthResponse = {
    user: decodeUser(user),
  };
  if (identity) {
    response.identity = decodeIdentity(identity);
  }
  if (access_token) {
    response.accessToken = access_token;
  }
  if (refresh_token) {
    response.refreshToken = refresh_token;
  }
  if (session_id) {
    response.sessionID = session_id;
  }
  return response;
}

/**
 * @public
 */
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

/**
 * @public
 */
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

/**
 * @public
 */
export function decodeSession(s: any): Session {
  const id = s.id;
  const identityID = s.identity_id;
  const createdAt = new Date(s.created_at);
  const lastAccessedAt = new Date(s.last_accessed_at);
  const createdByIP = s.created_by_ip;
  const lastAccessedByIP = s.last_accessed_by_ip;
  const userAgent = decodeSessionUserAgent(s.user_agent);
  const name = s.name;
  const data = s.data;
  return {
    id,
    identityID,
    createdAt,
    lastAccessedAt,
    createdByIP,
    lastAccessedByIP,
    userAgent,
    name,
    data,
  };
}

/**
 * @public
 */
export function decodeAuthenticator(a: any): Authenticator {
  const id = a.id;
  const type = a.type;
  const createdAt = new Date(a.created_at);
  const activatedAt = new Date(a.activated_at);
  switch (type) {
    case "totp":
      return {
        id,
        type,
        createdAt,
        activatedAt,
        displayName: a.display_name,
      };
    case "oob": {
      const channel = a.channel;
      switch (channel) {
        case "sms":
          return {
            id,
            type,
            createdAt,
            activatedAt,
            channel,
            maskedPhone: a.masked_phone,
          };
        case "email":
          return {
            id,
            type,
            createdAt,
            activatedAt,
            channel,
            maskedEmail: a.masked_email,
          };
        default:
          throw new Error("unknown authenticator channel: " + channel);
      }
    }
    default:
      throw new Error("unknown authenticator type: " + type);
  }
}

function decodeSessionUserAgent(ua: any): SessionUserAgent {
  return {
    raw: ua.raw,
    name: ua.name,
    version: ua.version,
    os: ua.os,
    osVersion: ua.os_version,
    deviceName: ua.device_name,
    deviceModel: ua.device_model,
  };
}

/**
 * @internal
 */
export function _decodeExtraSessionInfoOptions(
  o: any
): Partial<ExtraSessionInfoOptions> {
  const opts: Partial<ExtraSessionInfoOptions> = {};
  if (o.device_name !== undefined) {
    opts.deviceName = o.device_name;
  }
  return opts;
}

/**
 * @public
 */
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

/**
 * @public
 */
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

/**
 * @internal
 */
export function _encodeExtraSessionInfoOptions(
  o: ExtraSessionInfoOptions
): JSONObject {
  return {
    device_name: o.deviceName,
  };
}
