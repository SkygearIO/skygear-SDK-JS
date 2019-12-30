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
    public void openURL(String urlString, String scheme, Promise promise) {
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
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(urlString).normalizeScheme());

            String selfPackageName = getReactApplicationContext().getPackageName();
            ComponentName componentName =
                          intent.resolveActivity(getReactApplicationContext().getPackageManager());
            String otherPackageName = (componentName != null ? componentName.getPackageName() : "");
            // If there is no currentActivity or we are launching to a different package we need to set
            // the FLAG_ACTIVITY_NEW_TASK flag
            if (currentActivity == null || !selfPackageName.equals(otherPackageName)) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            }


            if (currentActivity != null) {
                currentActivity.startActivity(intent);
            } else {
                getReactApplicationContext().startActivity(intent);
            }
        } catch (Exception e) {
            if (this.openURLPromise != null) {
                this.openURLPromise.reject(e);
                this.openURLPromise = null;
            }
        }
    }

    @ReactMethod
    public void signInWithApple(String urlString, Promise promise) {
        promise.reject("EUNSPECIFIED", "Android does not support Sign in with Apple");
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
