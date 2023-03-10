#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SensitiveNotificationModule, NSObject)

RCT_EXTERN_METHOD(sendNotification:
                  (NSString *) title
                  body: (NSString *) body
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

@end
