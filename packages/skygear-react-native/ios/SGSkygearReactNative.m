#import "SGSkygearReactNative.h"
#import <CommonCrypto/CommonDigest.h>

@implementation SGSkygearReactNative

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(randomBytes:(NSUInteger)length resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
    resolve([self randomBytes:length]);
}

RCT_EXPORT_METHOD(sha256String:(NSString *)input resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
    resolve([self sha256String:input]);
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
