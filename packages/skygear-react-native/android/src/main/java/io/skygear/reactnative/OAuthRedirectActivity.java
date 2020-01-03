package io.skygear.reactnative;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

public class OAuthRedirectActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri uri = getIntent().getData();
        Intent intent = new Intent(SGSkygearReactNativeModule.OAUTH_ACTION, uri);
        this.getApplicationContext().sendBroadcast(intent);
        finish();
    }
}
