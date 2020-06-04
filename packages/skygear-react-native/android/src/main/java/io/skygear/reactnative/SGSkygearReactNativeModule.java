package io.skygear.reactnative;

import java.nio.charset.Charset;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.interfaces.RSAPublicKey;
import java.util.UUID;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import androidx.annotation.RequiresApi;

public class SGSkygearReactNativeModule extends ReactContextBaseJavaModule implements ActivityEventListener {

    private static final int REQUEST_CODE_AUTHORIZATION = 1;

    private final ReactApplicationContext reactContext;

    private Promise openURLPromise;

    public SGSkygearReactNativeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        reactContext.addActivityEventListener(this);
    }

    @Override
    public String getName() {
        return "SGSkygearReactNative";
    }

    @ReactMethod
    public void dismiss(Promise promise) {
        promise.resolve(null);
    }

    @ReactMethod
    public void randomBytes(int length, Promise promise) {
        SecureRandom rng = new SecureRandom();
        byte[] output = new byte[length];
        rng.nextBytes(output);
        promise.resolve(this.bytesToArray(output));
    }

    @ReactMethod
    public void sha256String(String input, Promise promise) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(input.getBytes(Charset.forName("UTF-8")));
            promise.resolve(this.bytesToArray(md.digest()));
        } catch (NoSuchAlgorithmException e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void openURL(String urlString, Promise promise) {
        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject(new Exception("No Activity"));
                return;
            }

            Context context = currentActivity;
            Uri uri = Uri.parse(urlString).normalizeScheme();
            Intent intent = OAuthCoordinatorActivity.createAuthorizationIntent(context, uri);
            currentActivity.startActivity(intent);

            promise.resolve(null);
        } catch (Exception e) {
            if (promise != null) {
                promise.reject(e);
            }
        }
    }

    @ReactMethod
    public void openAuthorizeURL(String urlString, String scheme, Promise promise) {
        this.openURLPromise = promise;

        try {
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject(new Exception("No Activity"));
                return;
            }

            Context context = currentActivity;
            Uri uri = Uri.parse(urlString).normalizeScheme();

            Intent intent = OAuthCoordinatorActivity.createAuthorizationIntent(context, uri);
            currentActivity.startActivityForResult(intent, REQUEST_CODE_AUTHORIZATION);
        } catch (Exception e) {
            if (this.openURLPromise != null) {
                this.openURLPromise.reject(e);
                this.cleanup();
            }
        }
    }

    @ReactMethod
    public void getAnonymousKey(String kid, Promise promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.reject("EUNSPECIFIED", "Anonymous authentication is not supported on Android before version M.");
            return;
        }

        try {
            if (kid == null) {
                kid = UUID.randomUUID().toString();
            }
            WritableMap header = Arguments.createMap();
            header.putString("kid", kid);
            header.putString("alg", "RS256");

            String alias = "io.skygear.keys.anonymous." + kid;
            KeyStore.PrivateKeyEntry entry = this.loadKey(alias);
            if (entry == null) {
                KeyPair kp = this.generateKey(alias);
                RSAPublicKey pubKey = (RSAPublicKey)kp.getPublic();
                WritableMap jwk = Arguments.createMap();
                jwk.putString("kid", kid);
                jwk.putString("kty", "RSA");
                jwk.putString("n", Base64.encodeToString(pubKey.getModulus().toByteArray(), Base64.NO_WRAP));
                jwk.putString("e", Base64.encodeToString(pubKey.getPublicExponent().toByteArray(), Base64.NO_WRAP));
                header.putMap("jwk", jwk);
            }

            promise.resolve(header);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void signAnonymousToken(String kid, String data, Promise promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.reject("EUNSPECIFIED", "Anonymous authentication is not supported on Android before version M.");
            return;
        }

        try {
            String alias = "io.skygear.keys.anonymous." + kid;
            KeyStore.PrivateKeyEntry entry = this.loadKey(alias);
            if (entry == null) {
                promise.reject("EUNSPECIFIED", "Anonymous user key not found.");
                return;
            }

            Signature s = Signature.getInstance("SHA256withRSA");
            s.initSign(entry.getPrivateKey());
            s.update(data.getBytes("UTF-8"));
            byte[] signature = s.sign();
            promise.resolve(Base64.encodeToString(signature, Base64.NO_WRAP));
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (this.openURLPromise == null) {
            return;
        }

        if (requestCode == REQUEST_CODE_AUTHORIZATION) {
            if (resultCode == Activity.RESULT_CANCELED) {
                this.openURLPromise.reject("CANCEL", "CANCEL");
            }
            if (resultCode == Activity.RESULT_OK) {
                this.openURLPromise.resolve(data.getData().toString());
            }
            this.cleanup();
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        // no-op
    }

    private void cleanup() {
        this.openURLPromise = null;
    }

    private WritableArray bytesToArray(byte[] bytes) {
        WritableArray arr = Arguments.createArray();
        for (int i = 0; i < bytes.length; i++) {
            arr.pushInt(bytes[i] & 0xff);
        }
        return arr;
    }

    @RequiresApi(api = Build.VERSION_CODES.M)
    private KeyStore.PrivateKeyEntry loadKey(String alias) throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        KeyStore.Entry entry = ks.getEntry(alias, null);
        if (!(entry instanceof KeyStore.PrivateKeyEntry)) {
            return null;
        }
        KeyStore.PrivateKeyEntry pke = (KeyStore.PrivateKeyEntry)entry;
        return pke;
    }

    @RequiresApi(api = Build.VERSION_CODES.M)
    private KeyPair generateKey(String alias) throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore");
        kpg.initialize(
                new KeyGenParameterSpec.Builder(alias,
                        KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY
                )
                        .setDigests(KeyProperties.DIGEST_SHA256)
                        .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1)
                        .build()
        );
        KeyPair kp = kpg.generateKeyPair();
        return kp;
    }
}
