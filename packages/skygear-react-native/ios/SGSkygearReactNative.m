#import <AuthenticationServices/AuthenticationServices.h>
#import <SafariServices/SafariServices.h>
#import <CommonCrypto/CommonDigest.h>
#import <React/RCTUtils.h>
#import "SGSkygearReactNative.h"

static NSString *const kOpenURLNotification = @"SGSkygearReactNativeOpenURLNotification";

static void postNotificationWithURL(NSURL *URL, id sender)
{
  NSDictionary<NSString *, id> *payload = @{@"url": URL.absoluteString};
  [[NSNotificationCenter defaultCenter] postNotificationName:kOpenURLNotification
                                                      object:sender
                                                    userInfo:payload];
}

@interface SGSkygearReactNative() <ASWebAuthenticationPresentationContextProviding>
// We must have strong reference to the session otherwise it is closed immediately when
// it goes out of scope.
@property (nonatomic, strong) ASWebAuthenticationSession *asSession;
@property (nonatomic, strong) SFAuthenticationSession *sfSession;
@property (nonatomic, strong) RCTPromiseResolveBlock openURLResolve;
@property (nonatomic, strong) RCTPromiseRejectBlock openURLReject;
@end

@implementation SGSkygearReactNative

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (instancetype)init
{
    if ((self = [super init])) {
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(handleOpenURLNotification:)
                                                     name:kOpenURLNotification
                                                   object:nil];
    }
    return self;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

+ (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)URL
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  postNotificationWithURL(URL, self);
  return YES;
}

+ (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)URL
  sourceApplication:(NSString *)sourceApplication
         annotation:(id)annotation
{
  postNotificationWithURL(URL, self);
  return YES;
}

+ (BOOL)application:(UIApplication *)application
continueUserActivity:(NSUserActivity *)userActivity
  restorationHandler:
    #if defined(__IPHONE_OS_VERSION_MAX_ALLOWED) && (__IPHONE_OS_VERSION_MAX_ALLOWED >= 12000) /* __IPHONE_12_0 */
        (nonnull void (^)(NSArray<id<UIUserActivityRestoring>> *_Nullable))restorationHandler {
    #else
        (nonnull void (^)(NSArray *_Nullable))restorationHandler {
    #endif
  if ([userActivity.activityType isEqualToString:NSUserActivityTypeBrowsingWeb]) {
    postNotificationWithURL(userActivity.webpageURL, self);
  }
  return YES;
}

RCT_EXPORT_METHOD(openURL:(NSURL *)url
                   scheme:(NSString *)scheme
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject)
{
    self.openURLResolve = resolve;
    self.openURLReject = reject;

    if (@available(iOS 12.0, *)) {
        self.asSession = [[ASWebAuthenticationSession alloc] initWithURL:url
                                                                            callbackURLScheme:scheme
                                                                            completionHandler:^(NSURL *url, NSError *error) {
            if (error) {
                if (self.openURLReject) {
                    self.openURLReject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", url], error);
                    self.openURLResolve = nil;
                    self.openURLReject = nil;
                }
            } else {
                if (self.openURLResolve) {
                    self.openURLResolve([url absoluteString]);
                    self.openURLResolve = nil;
                    self.openURLReject = nil;
                }
            }
            self.asSession = nil;
        }];
        if (@available(iOS 13.0, *)) {
            self.asSession.presentationContextProvider = self;
        }
        [self.asSession start];
    } else if (@available(iOS 11.0, *)) {
        self.sfSession = [[SFAuthenticationSession alloc] initWithURL:url
                                                                      callbackURLScheme:scheme
                                                                      completionHandler:^(NSURL *url, NSError *error) {
            if (error) {
                if (self.openURLReject) {
                    self.openURLReject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", url], error);
                    self.openURLResolve = nil;
                    self.openURLReject = nil;
                }
            } else {
                if (self.openURLResolve) {
                    self.openURLResolve([url absoluteString]);
                    self.openURLResolve = nil;
                    self.openURLReject = nil;
                }
            }
            self.sfSession = nil;
        }];
        [self.sfSession start];
    } else if (@available(iOS 10.0, *)) {
        [RCTSharedApplication() openURL:url options:@{} completionHandler:^(BOOL success) {
            if (!success) {
                if (self.openURLReject) {
                    self.openURLReject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", url], nil);
                    self.openURLResolve = nil;
                    self.openURLReject = nil;
                }
            }
        }];
    } else {
        BOOL opened = [RCTSharedApplication() openURL:url];
        if (!opened) {
            if (self.openURLReject) {
                self.openURLReject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", url], nil);
                self.openURLResolve = nil;
                self.openURLReject = nil;
            }
        }
    }
}

RCT_EXPORT_METHOD(randomBytes:(NSUInteger)length resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
    resolve([self randomBytes:length]);
}

RCT_EXPORT_METHOD(sha256String:(NSString *)input resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
    resolve([self sha256String:input]);
}

- (ASPresentationAnchor)presentationAnchorForWebAuthenticationSession:(ASWebAuthenticationSession *)session
{
    for (__kindof UIWindow *w in [RCTSharedApplication() windows]) {
        if ([w isKeyWindow]) {
            return w;
        }
    }
    return nil;
}

- (void)handleOpenURLNotification:(NSNotification *)notification
{
    NSString *urlString = notification.userInfo[@"url"];
    if (self.openURLResolve) {
        self.openURLResolve(urlString);
        self.openURLResolve = nil;
        self.openURLReject = nil;
    }
}

-(NSArray *)randomBytes:(NSUInteger)length
{
    NSMutableData *data = [NSMutableData dataWithLength:length];
    SecRandomCopyBytes(kSecRandomDefault, length, [data mutableBytes]);
    NSMutableArray *arr = [NSMutableArray arrayWithCapacity:length];
    const char *bytes = [data bytes];
    for (int i = 0; i < [data length]; i++) {
        [arr addObject:[NSNumber numberWithInt:(bytes[i] & 0xff)]];
    }
    return arr;
}

-(NSArray *)sha256String:(NSString *)input
{
    NSData *utf8 = [input dataUsingEncoding:NSUTF8StringEncoding];
    unsigned char result[CC_SHA256_DIGEST_LENGTH];
    CC_SHA256([utf8 bytes], [utf8 length], result);
    NSMutableArray *arr = [NSMutableArray arrayWithCapacity:CC_SHA256_DIGEST_LENGTH];
    for (int i = 0; i < CC_SHA256_DIGEST_LENGTH; i++) {
        [arr addObject:[NSNumber numberWithInt:(result[i] & 0xff)]];
    }
    return arr;
}

@end
