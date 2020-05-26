package io.skygear.reactnative;

import java.util.ArrayList;
import java.util.List;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabsService;

public class OAuthCoordinatorActivity extends Activity {

    private static final String KEY_AUTHORIZATION_URL = "KEY_AUTHORIZATION_URL";

    private boolean mAuthorizationActivityStarted = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();

        if (!this.mAuthorizationActivityStarted) {
            this.startAuthorizationActivity();
            this.mAuthorizationActivityStarted = true;
            return;
        }


        if (this.getIntent().getData() != null) {
            this.handleRedirect(this.getIntent().getData());
        } else {
            this.handleCancel();
        }

        this.finish();
    }

    private void startAuthorizationActivity() {
        Context context = this;
        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                .build();
        String chromePackageName = getChromePackageName(context);

        Uri uri = Uri.parse(this.getIntent().getStringExtra(KEY_AUTHORIZATION_URL));

        Intent intent;

        if (chromePackageName == null) {
            intent = new Intent(Intent.ACTION_VIEW, uri);
        } else {
            customTabsIntent.intent.setPackage(chromePackageName);
            customTabsIntent.intent.setData(uri);
            intent = customTabsIntent.intent;
        }

        this.startActivity(intent);
    }

    private void handleRedirect(Uri uri) {
        Intent intent = new Intent();
        intent.setData(uri);
        this.setResult(Activity.RESULT_OK, intent);
    }

    private void handleCancel() {
        Intent intent = new Intent();
        this.setResult(Activity.RESULT_CANCELED, intent);
    }

    public static Intent createAuthorizationIntent(Context context, Uri uri) {
        Intent intent = new Intent(context, OAuthCoordinatorActivity.class);
        intent.putExtra(KEY_AUTHORIZATION_URL, uri.toString());
        return intent;
    }

    public static Intent createRedirectIntent(Context context, Uri uri) {
        Intent intent = new Intent(context, OAuthCoordinatorActivity.class);
        intent.setData(uri);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return intent;
    }

    private static String getChromePackageName(Context context) {
        Intent activityIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com"));
        List<ResolveInfo> resolvedActivities = context.getPackageManager().queryIntentActivities(activityIntent, 0);
        ArrayList<String> packages = new ArrayList<String>();
        for (ResolveInfo info : resolvedActivities) {
            Intent serviceIntent = new Intent(CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION);
            serviceIntent.setPackage(info.activityInfo.packageName);
            if (context.getPackageManager().resolveService(serviceIntent, 0) != null) {
                packages.add(info.activityInfo.packageName);
            }
        }
        if (packages.size() == 0) {
            return null;
        }
        if (packages.size() == 1) {
            return packages.get(0);
        }
        if (packages.contains("com.android.chrome")) {
            return "com.android.chrome";
        }
        if (packages.contains("com.chrome.beta")) {
            return "com.chrome.beta";
        }
        if (packages.contains("com.chrome.dev")) {
            return "com.chrome.dev";
        }
        if (packages.contains("com.google.android.apps.chrome")) {
            return "com.google.android.apps.chrome";
        }
        return null;
    }

}
