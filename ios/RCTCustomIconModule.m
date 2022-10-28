#import "RCTCustomIconModule.h"

@implementation RCTCustomIconModule
RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(changeAppIcon:(NSString * _Nullable)name
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if ([[UIApplication sharedApplication] supportsAlternateIcons] == NO)
    {
      reject(@"update_failure", @"Alternative icons is not supported.", nil);
      return;
    }
    
    // すでに同じアイコンを使用している場合は処理しない
    NSString * alternateIconName = [[UIApplication sharedApplication] alternateIconName];
    if ([alternateIconName isEqual:name]) {
      resolve(nil);
      return;
    }
    
    [[UIApplication sharedApplication] setAlternateIconName: name
                                          completionHandler:^(NSError * _Nullable error) {
      if (error != nil) {
        reject(@"update_failure", [error description], nil);
        return;
      }
      resolve(nil);
    }];
  });
}
@end
