import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import {SkygearResponse} from './transport/common';
import registry from './registry';
import {settings} from './settings';
import URLSafeBase64 from 'urlsafe-base64';
import S3URLSigner from 'amazon-s3-url-signer';
import request from 'superagent';
import URL from 'url';

/**
 * staticAssetHandler — default handler for serving static assets with during
 * development.
 */

export function staticAssetHandler(req) {
  if (req.path.indexOf('/static') !== 0) {
    throw new Error('The base path is not static asset');
  }
  let matchedPrefix = null;
  Object.keys(registry.staticAsset).forEach((prefix) => {
    if (req.path.indexOf('/static' + prefix) === 0) {
      matchedPrefix = prefix;
    }
  });
  if (!matchedPrefix) {
    return new SkygearResponse({
      statusCode: 404
    });
  }
  const matchedFunc = registry.staticAsset[matchedPrefix];
  const absPrefix = matchedFunc();
  const finalPath = req.path.replace('/static' + matchedPrefix, absPrefix);
  if (!fs.existsSync(finalPath)) {
    return new SkygearResponse({
      statusCode: 404
    });
  }
  const data = fs.readFileSync(finalPath, {
    flag: 'r'
  });
  const contentType = mime.contentType(path.extname(finalPath));
  return new SkygearResponse({
    headers: {
      'Content-Type': [contentType]
    },
    body: data
  });
}

class Signer {
  /**
   * @name Signer#sign
   * @return {Promise<string>} A Promise of the url
   */
  sign() {
    throw new Error('Not implemented, subclass should override this method');
  }
}

/* eslint-disable camelcase */
export class FSSigner extends Signer {
  constructor(_settings) {
    super();
    this.assetStoreURLPrefix = _settings.assetStoreURLPrefix;
    this.assetStoreURLExpireDuration =
      _settings.assetStoreURLExpireDuration;
    this.assetStoreSecret = _settings.assetStoreSecret;
  }

  sign(name) {
    const prefix = this.assetStoreURLPrefix;
    const duration = this.assetStoreURLExpireDuration;
    const expire = Math.floor(Date.now() / 1000) + duration;
    const secret = this.assetStoreSecret;
    const hash = crypto.createHmac('sha256', secret)
      .update(name)
      .update(expire.toString())
      .digest()
      .slice(0, -1);
    const encoded = URLSafeBase64.encode(hash);
    const fullURL =
      `${prefix}/${name}?expiredAt=${expire.toString()}&signature=${encoded}`;
    return Promise.resolve(fullURL);
  }
}

export class CloudSigner extends Signer {
  constructor(_settings) {
    super();
    this.request = request;
    this.appName = _settings.appName;
    this.assetStoreURLExpireDuration =
      _settings.assetStoreURLExpireDuration;
    this.cloudAssetToken = _settings.cloudAssetToken;
    this.cloudAssetHost = _settings.cloudAssetHost;
    const isPublic = !!_settings.cloudAssetStorePublic;
    this.prefix = isPublic ?
      _settings.cloudAssetPublicPrefix :
      _settings.cloudAssetPrivatePrefix;
    this.signerSecret = null;
    this.expiredAt = null;
    this.extra = null;
  }

  refreshSignerToken() {
    const appName = this.appName;
    const duration = parseInt(this.assetStoreURLExpireDuration);
    const expire = Math.floor(Date.now() / 1000) + duration;
    const token = this.cloudAssetToken;
    const host = this.cloudAssetHost;
    const url = `${host}/token/${appName}`;

    return this.request.get(url)
      .accept('application/json')
      .set('Authorization', `Bearer ${token}`)
      .query({expired_at: expire.toString()})
      .then(response => {
        const body = response.body;
        this.signerSecret = body.value;
        this.expiredAt = new Date(body.expired_at);
        this.extra = body.extra;
      });
  }

  needRefreshSignerToken() {
    if (this.signerSecret === null) {
      return true;
    }
    if (this.expiredAt < new Date()) {
      return true;
    }
    return false;
  }

  sign(name) {
    if (this.needRefreshSignerToken()) {
      return this.refreshSignerToken()
        .then(()=> this.sign(name));
    }
    const appName = this.appName;
    const duration = parseInt(this.assetStoreURLExpireDuration);
    const expired = Math.floor(Date.now() / 1000) + duration;

    const hash = crypto.createHmac('sha256', this.signerSecret)
      .update(appName)
      .update(name)
      .update(expired.toString())
      .update(this.extra)
      .digest('base64');
    const signatureAndExtra =
      encodeURIComponent(`${hash}.${this.extra}`);

    return Promise.resolve(`${this.prefix}/${appName}/${name}` +
      `?expired_at=${expired}&signature=${signatureAndExtra}`);
  }
}

export class S3Signer extends Signer {
  constructor(_settings) {
    super();

    this.assetStoreS3AccessKey = _settings.assetStoreS3AccessKey;
    this.assetStoreS3SecretKey = _settings.assetStoreS3SecretKey;
    this.assetStoreS3URLPrefix = _settings.assetStoreS3URLPrefix;
    this.assetStoreS3Region = _settings.assetStoreS3Region;
    this.assetStoreS3Bucket = _settings.assetStoreS3Bucket;
    this.assetStoreURLExpireDuration = _settings.assetStoreURLExpireDuration;

    const key = this.assetStoreS3AccessKey;
    const secret = this.assetStoreS3SecretKey;
    const prefix = this.assetStoreS3URLPrefix;
    let host;
    let bucket;
    if (prefix) {
      const parsed = URL.parse(prefix);
      host = parsed.host;
      bucket = parsed.pathname;
    } else {
      const region = this.assetStoreS3Region;
      host = `s3-${region}.amazonaws.com`;
      bucket = this.assetStoreS3Bucket;
    }

    this.signer = S3URLSigner.urlSigner(key, secret, {
      host: host
    });
    this.bucket = bucket;
  }
  sign(name) {
    const duration = this.assetStoreURLExpireDuration;
    const url = this.signer.getUrl('GET', name, this.bucket, duration);
    return Promise.resolve(url);
  }
}

let sharedSigner = null;
/**
 * Return a shared signer for the current configuration.
 *
 * @return {Signer}
 */
export function getSigner() {
  if (sharedSigner === null) {
    switch (settings.assetStore) {
    case 'fs':
      sharedSigner = new FSSigner(settings);
      break;
    case 's3':
      sharedSigner = new S3Signer(settings);
      break;
    case 'cloud':
      sharedSigner = new CloudSigner(settings);
      break;
    default:
      throw new Error(`Unknown asset store type: ${settings.assetStore}`);
    }
  }
  return sharedSigner;
}
