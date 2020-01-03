#import <UIKit/UIKit.h>
#if defined(__IPHONE_OS_VERSION_MAX_ALLOWED) && (__IPHONE_OS_VERSION_MAX_ALLOWED >= 12000) /* __IPHONE_12_0 */
#import <UIKit/UIUserActivity.h>
#endif
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface SGSkygearReactNative : RCTEventEmitter <RCTBridgeModule>

+ (BOOL)application:(nonnull UIApplication *)app
            openURL:(nonnull NSURL *)URL
            options:(nonnull NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options;

+ (BOOL)application:(nonnull UIApplication *)application
              openURL:(nonnull NSURL *)URL
    sourceApplication:(nullable NSString *)sourceApplication
           annotation:(nonnull id)annotation;

+ (BOOL)application:(nonnull UIApplication *)application
    continueUserActivity:(nonnull NSUserActivity *)userActivity
      restorationHandler:
        #if defined(__IPHONE_OS_VERSION_MAX_ALLOWED) && (__IPHONE_OS_VERSION_MAX_ALLOWED >= 12000) /* __IPHONE_12_0 */
            (nonnull void (^)(NSArray<id<UIUserActivityRestoring>> *_Nullable))restorationHandler;
        #else
            (nonnull void (^)(NSArray *_Nullable))restorationHandler;
        #endif

@end
