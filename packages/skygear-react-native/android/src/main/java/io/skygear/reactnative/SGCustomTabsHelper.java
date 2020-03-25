package io.skygear.reactnative;

import java.util.ArrayList;
import java.util.List;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.net.Uri;

import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabsService;

public class SGCustomTabsHelper {
    public static void openURL(Context context, Uri uri) {
        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
            .build();
        String chromePackageName = getChromePackageName(context);
        if (chromePackageName == null) {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } else {
            customTabsIntent.intent.setPackage(chromePackageName);
            // The custom tabs must be launched as new task
            // because there is no way to close the custom tabs programmatically.
            customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            customTabsIntent.launchUrl(context, uri);
        }
    }

    public static String getChromePackageName(Context context) {
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
