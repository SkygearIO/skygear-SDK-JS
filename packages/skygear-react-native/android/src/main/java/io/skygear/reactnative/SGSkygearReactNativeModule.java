package io.skygear.reactnative;

import java.nio.charset.Charset;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;

public class SGSkygearReactNativeModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

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

    private WritableArray bytesToArray(byte[] bytes) {
        WritableArray arr = Arguments.createArray();
        for (int i = 0; i < bytes.length; i++) {
            arr.pushInt(bytes[i] & 0xff);
        }
        return arr;
    }
}
