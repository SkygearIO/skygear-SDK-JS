import {
  User,
  Identity,
  Session,
  SessionUserAgent,
  JSONObject,
  AuthResponse,
  ExtraSessionInfoOptions,
} from "./types";

/**
 * @public
 */
export function decodeAuthResponse(r: any): AuthResponse {
  const { user, access_token, refresh_token, session_id, expires_in } = r;
  const response: AuthResponse = {
    user: decodeUser(user),
  };
  if (access_token) {
    response.accessToken = access_token;
  }
  if (refresh_token) {
    response.refreshToken = refresh_token;
  }
  if (session_id) {
    response.sessionID = session_id;
  }
  if (expires_in) {
    response.expiresIn = expires_in;
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
  const isManuallyVerified = u.is_manually_verified;
  const isDisabled = u.is_disabled;
  const isAnonymous = u.is_anonymous;
  const metadata = u.metadata;
  return {
    id,
    createdAt,
    lastLoginAt,
    isManuallyVerified,
    isVerified,
    isDisabled,
    isAnonymous,
    metadata,
  };
}

/**
 * @public
 */
export function decodeIdentity(i: any): Identity {
  const { type, claims } = i;
  return { type, claims };
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
    is_manually_verified: u.isManuallyVerified,
    is_verified: u.isVerified,
    is_disabled: u.isDisabled,
    is_anonymous: u.isAnonymous,
    metadata: u.metadata,
  };
}

/**
 * @public
 */
export function encodeIdentity(i: Identity): JSONObject {
  return {
    type: i.type,
    claims: i.claims,
  };
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

/**
 * @internal
 */
export function _decodeAuthResponseFromOIDCUserinfo(u: any): AuthResponse {
  const { sub, skygear_user, skygear_session_id } = u;

  if (!skygear_user) {
    throw new Error("missing skygear_user in userinfo");
  }

  const user = decodeUser(skygear_user);
  user.id = sub;

  const response: AuthResponse = {
    user: user,
  };

  if (skygear_session_id) {
    response.sessionID = skygear_session_id;
  }

  return response;
}
