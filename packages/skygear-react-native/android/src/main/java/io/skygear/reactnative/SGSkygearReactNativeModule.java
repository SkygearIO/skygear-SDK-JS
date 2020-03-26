package io.skygear.reactnative;

import java.nio.charset.Charset;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;

public class SGSkygearReactNativeModule extends ReactContextBaseJavaModule {

    static final String OAUTH_ACTION = "SGSkygearReactNativeOAuthAction";

    private final ReactApplicationContext reactContext;

    private Promise openURLPromise;
    private BroadcastReceiver openURLReceiver;

    public SGSkygearReactNativeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SGSkygearReactNative";
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
            Uri uri = Uri.parse(urlString).normalizeScheme();
            Context context = currentActivity != null ? currentActivity : getReactApplicationContext();
            SGCustomTabsHelper.openURL(context, uri);
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

        if (this.openURLReceiver != null) {
            this.reactContext.getApplicationContext().unregisterReceiver(this.openURLReceiver);
            this.openURLReceiver = null;
        }

        this.openURLReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                SGSkygearReactNativeModule.this.onIntent(intent);
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(OAUTH_ACTION);
        filter.addDataScheme(scheme);
        this.reactContext.getApplicationContext().registerReceiver(this.openURLReceiver, filter);

        try {
            Activity currentActivity = getCurrentActivity();
            Uri uri = Uri.parse(urlString).normalizeScheme();
            Context context = currentActivity != null ? currentActivity : getReactApplicationContext();
            SGCustomTabsHelper.openURL(context, uri);
        } catch (Exception e) {
            if (this.openURLPromise != null) {
                this.openURLPromise.reject(e);
                this.openURLPromise = null;
            }
        }
    }

    @ReactMethod
    public void signInWithApple(String urlString, Promise promise) {
        promise.reject("EUNSPECIFIED", "Sign in with Apple is not supported on Android. Please use loginOAuthProvider or linkOAuthProvider instead.");
    }

    @ReactMethod
    public void getCredentialStateForUserID(String userID, Promise promise) {
        promise.reject("EUNSPECIFIED", "Sign in with Apple is not supported on Android. Please use loginOAuthProvider or linkOAuthProvider instead.");
    }

    private WritableArray bytesToArray(byte[] bytes) {
        WritableArray arr = Arguments.createArray();
        for (int i = 0; i < bytes.length; i++) {
            arr.pushInt(bytes[i] & 0xff);
        }
        return arr;
    }

    private void onIntent(Intent intent) {
        Uri uri = intent.getData();
        if (uri == null) {
            return;
        }
        if (this.openURLPromise == null) {
            return;
        }
        this.openURLPromise.resolve(uri.toString());
        this.openURLPromise = null;
    }
}
