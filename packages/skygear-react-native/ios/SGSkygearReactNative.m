#if defined(__IPHONE_OS_VERSION_MAX_ALLOWED) && (__IPHONE_OS_VERSION_MAX_ALLOWED >= 12000)
#import <AuthenticationServices/AuthenticationServices.h>
#endif
#import <SafariServices/SafariServices.h>
#import <CommonCrypto/CommonDigest.h>
#import <React/RCTUtils.h>
#import "SGSkygearReactNative.h"

static NSString *const kOpenURLNotification = @"SGSkygearReactNativeOpenURLNotification";
static NSString *const kAppleIDCredentialRevokedNotification = @"SGSkygearReactNativeAppleIDCredentialRevokedNotification";

static void postNotificationWithURL(NSURL *URL, id sender)
{
  NSDictionary<NSString *, id> *payload = @{@"url": URL.absoluteString};
  [[NSNotificationCenter defaultCenter] postNotificationName:kOpenURLNotification
                                                      object:sender
                                                    userInfo:payload];
}

@interface SGSkygearReactNative()
@property (nonatomic, strong) RCTPromiseResolveBlock openURLResolve;
@property (nonatomic, strong) RCTPromiseRejectBlock openURLReject;
@property (nonatomic, strong) NSString *state;
@property (nonatomic, strong) NSString *nonce;
@property (nonatomic, strong) RCTPromiseResolveBlock signInWithAppleResolve;
@property (nonatomic, strong) RCTPromiseRejectBlock signInWithAppleReject;
@end

#if defined(__IPHONE_OS_VERSION_MAX_ALLOWED) && (__IPHONE_OS_VERSION_MAX_ALLOWED >= 11000)
@interface SGSkygearReactNative()
// We must have strong reference to the session otherwise it is closed immediately when
// it goes out of scope.
@property (nonatomic, strong) SFAuthenticationSession *sfSession API_AVAILABLE(ios(11));
@end
#endif

#if defined(__IPHONE_OS_VERSION_MAX_ALLOWED) && (__IPHONE_OS_VERSION_MAX_ALLOWED >= 12000)
@interface SGSkygearReactNative() <ASWebAuthenticationPresentationContextProviding>
// We must have strong reference to the session otherwise it is closed immediately when
// it goes out of scope.
@property (nonatomic, strong) ASWebAuthenticationSession *asSession API_AVAILABLE(ios(12));
@end
#endif

#if defined(__IPHONE_OS_VERSION_MAX_ALLOWED) && (__IPHONE_OS_VERSION_MAX_ALLOWED >= 13000)
@interface SGSkygearReactNative() <ASAuthorizationControllerPresentationContextProviding, ASAuthorizationControllerDelegate>
@property (nonatomic, strong) ASAuthorizationAppleIDProvider *provider API_AVAILABLE(ios(13));
@property (nonatomic, strong) ASAuthorizationController *controller API_AVAILABLE(ios(13));
@end
#endif

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

- (NSArray<NSString *> *)supportedEvents
{
  return @[kAppleIDCredentialRevokedNotification];
}

- (void)startObserving
{
  if (@available(iOS 13.0, *)) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleRevokedNotification:)
                                                 name:ASAuthorizationAppleIDProviderCredentialRevokedNotification
                                               object:nil];
  }
}

- (void)stopObserving
{
  if (@available(iOS 13.0, *)) {
    [[NSNotificationCenter defaultCenter] removeObserver:self
                                                    name:ASAuthorizationAppleIDProviderCredentialRevokedNotification
                                                  object:nil];
  }
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
    #if defined(__IPHONE_OS_VERSION_MAX_ALLOWED) && (__IPHONE_OS_VERSION_MAX_ALLOWED >= 12000)
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
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject)
{
    if (@available(iOS 12.0, *)) {
        self.asSession = [[ASWebAuthenticationSession alloc] initWithURL:url
                                                       callbackURLScheme:nil
                                                       completionHandler:^(NSURL *url, NSError *error) {
            self.asSession = nil;
        }];
        if (@available(iOS 13.0, *)) {
            self.asSession.presentationContextProvider = self;
        }
        BOOL started = [self.asSession start];
        if (!started) {
            if (reject) {
                reject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", url], nil);
            }
        } else {
            if (resolve) {
                resolve(nil);
            }
        }
    } else if (@available(iOS 11.0, *)) {
        self.sfSession = [[SFAuthenticationSession alloc] initWithURL:url
                                                    callbackURLScheme:nil
                                                    completionHandler:^(NSURL *url, NSError *error){
            self.sfSession = nil;
        }];
        BOOL started = [self.sfSession start];
        if (!started) {
            if (reject) {
                reject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", url], nil);
            }
        } else {
            if (resolve) {
                resolve(nil);
            }
        }
    } else if (@available(iOS 10.0, *)) {
        [RCTSharedApplication() openURL:url options:@{} completionHandler:^(BOOL success) {
            if (!success) {
                if (reject) {
                    reject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", url], nil);
                }
            } else {
                if (resolve) {
                    resolve(nil);
                }
            }
        }];
    } else {
        bool started = [RCTSharedApplication() openURL:url];
        if (!started) {
            if (reject) {
                reject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", url], nil);
            }
        } else {
            if (resolve) {
                resolve(nil);
            }
        }
    }
}

RCT_EXPORT_METHOD(openAuthorizeURL:(NSURL *)url
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
                BOOL isUserCancelled = ([[error domain] isEqualToString:ASWebAuthenticationSessionErrorDomain] &&
                [error code] == ASWebAuthenticationSessionErrorCodeCanceledLogin);
                if (!isUserCancelled && self.openURLReject) {
                    self.openURLReject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", url], error);
                }
            } else {
                if (self.openURLResolve) {
                    self.openURLResolve([url absoluteString]);
                }
            }
            self.openURLResolve = nil;
            self.openURLReject = nil;
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
                BOOL isUserCancelled = ([[error domain] isEqualToString:SFAuthenticationErrorDomain] &&
                [error code] == SFAuthenticationErrorCanceledLogin);
                if (!isUserCancelled && self.openURLReject) {
                    self.openURLReject(RCTErrorUnspecified, [NSString stringWithFormat:@"Unable to open URL: %@", url], error);
                }
            } else {
                if (self.openURLResolve) {
                    self.openURLResolve([url absoluteString]);
                }
            }
            self.openURLResolve = nil;
            self.openURLReject = nil;
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

RCT_EXPORT_METHOD(signInWithApple:(NSString *)url
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject)
{
  if (@available(iOS 13.0, *)) {
    NSString *state = nil;
    NSString *nonce = nil;
    NSURLComponents *components = [NSURLComponents componentsWithString:url];
    for (NSURLQueryItem *item in components.queryItems) {
      if ([item.name isEqualToString:@"state"]) {
        state = item.value;
      }
      if ([item.name isEqualToString:@"nonce"]) {
        nonce = item.value;
      }
    }

    if (!state || !nonce) {
      reject(RCTErrorUnspecified, [NSString stringWithFormat:@"Invalid URL: %@", url], nil);
      return;
    }

    ASAuthorizationAppleIDProvider *provider = [[ASAuthorizationAppleIDProvider alloc] init];

    ASAuthorizationAppleIDRequest *request = [provider createRequest];
    request.requestedOperation = ASAuthorizationOperationLogin;
    request.requestedScopes = @[ASAuthorizationScopeEmail];
    request.state = state;
    request.nonce = nonce;

    ASAuthorizationController *controller = [[ASAuthorizationController alloc] initWithAuthorizationRequests:@[request]];
    controller.presentationContextProvider = self;
    controller.delegate = self;

    self.provider = provider;
    self.controller = controller;
    self.state = state;
    self.nonce = nonce;
    self.signInWithAppleResolve = resolve;
    self.signInWithAppleReject = reject;

    [controller performRequests];
  } else {
    reject(RCTErrorUnspecified, @"signInWithApple requires iOS 13. Please use loginOAuthProvider or linkOAuthProvider instead.", nil);
    return;
  }
}

RCT_EXPORT_METHOD(getCredentialStateForUserID:(NSString *)userID
                                      resolve:(RCTPromiseResolveBlock)resolve
                                       reject:(RCTPromiseRejectBlock)reject)
{
  if (@available(iOS 13.0, *)) {
    ASAuthorizationAppleIDProvider *provider = [[ASAuthorizationAppleIDProvider alloc] init];
    [provider getCredentialStateForUserID:userID completion:^(ASAuthorizationAppleIDProviderCredentialState credentialState, NSError *error) {
      if (error) {
        reject(RCTErrorUnspecified, @"getCredentialStateForUserID", error);
      } else {
        switch (credentialState) {
        case ASAuthorizationAppleIDProviderCredentialAuthorized:
          resolve(@"Authorized");
          break;
        case ASAuthorizationAppleIDProviderCredentialNotFound:
          resolve(@"NotFound");
          break;
        case ASAuthorizationAppleIDProviderCredentialRevoked:
          resolve(@"Revoked");
          break;
        case ASAuthorizationAppleIDProviderCredentialTransferred:
          resolve(@"Transferred");
          break;
        default:
          reject(RCTErrorUnspecified, @"unexpected credential state", nil);
          break;
        }
      }
    }];
  } else {
    reject(RCTErrorUnspecified, @"getCredentialStateForUserID requires iOS 13. Please check the device OS version before calling this function.", nil);
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

- (ASPresentationAnchor)presentationAnchorForWebAuthenticationSession:(ASWebAuthenticationSession *)session API_AVAILABLE(ios(12))
{
  for (__kindof UIWindow *w in [RCTSharedApplication() windows]) {
    if ([w isKeyWindow]) {
      return w;
    }
  }
  return nil;
}

- (ASPresentationAnchor)presentationAnchorForAuthorizationController:(ASAuthorizationController *)controller API_AVAILABLE(ios(13))
{
  for (__kindof UIWindow *w in [RCTSharedApplication() windows]) {
    if ([w isKeyWindow]) {
      return w;
    }
  }
  return nil;
}

- (void)authorizationController:(ASAuthorizationController *)controller
   didCompleteWithAuthorization:(ASAuthorization *)authorization API_AVAILABLE(ios(13))
{
  id credential = authorization.credential;
  if ([credential isKindOfClass:[ASAuthorizationAppleIDCredential class]]) {
    ASAuthorizationAppleIDCredential *c = (ASAuthorizationAppleIDCredential *) credential;
    NSData *authorizationCodeData = c.authorizationCode;
    NSArray<ASAuthorizationScope> *authorizedScopes = c.authorizedScopes;
    NSString *authorizationCode = [[NSString alloc] initWithData:authorizationCodeData
                                                        encoding:NSUTF8StringEncoding];
    NSString *scope = [authorizedScopes componentsJoinedByString:@" "];
    if (self.signInWithAppleResolve) {
      self.signInWithAppleResolve(@{
        @"state": self.state,
        @"code": authorizationCode,
        @"scope": scope,
      });
      self.provider = nil;
      self.controller = nil;
      self.state = nil;
      self.nonce = nil;
      self.signInWithAppleResolve = nil;
      self.signInWithAppleReject = nil;
    }
  }
}

- (void)authorizationController:(ASAuthorizationController *)controller
           didCompleteWithError:(NSError *)error API_AVAILABLE(ios(13))
{
  if ([ASAuthorizationErrorDomain isEqualToString:error.domain]) {
    NSString *reason = @"unexpected error code";
    switch (error.code) {
    case ASAuthorizationErrorCanceled:
      reason = @"Canceled";
      break;
    case ASAuthorizationErrorFailed:
      reason = @"Failed";
      break;
    case ASAuthorizationErrorInvalidResponse:
      reason = @"InvalidResponse";
      break;
    case ASAuthorizationErrorNotHandled:
      reason = @"NotHandled";
      break;
    case ASAuthorizationErrorUnknown:
      reason = @"Unknown";
      break;
    default:
      break;
    }
    if (self.signInWithAppleReject) {
      self.signInWithAppleReject(RCTErrorUnspecified, reason, error);
      self.provider = nil;
      self.controller = nil;
      self.state = nil;
      self.nonce = nil;
      self.signInWithAppleResolve = nil;
      self.signInWithAppleReject = nil;
    }
  }
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

- (void)handleRevokedNotification:(NSNotification *)notification
{
  [self sendEventWithName:kAppleIDCredentialRevokedNotification body:@{}];
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
