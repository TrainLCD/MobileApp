#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LiveActivityModule, NSObject)

RCT_EXTERN_METHOD(startLiveActivity: (nonnull NSDictionary) initialState)
RCT_EXTERN_METHOD(updateLiveActivity: (nonnull NSDictionary) nextState)
RCT_EXTERN_METHOD(stopLiveActivity: (nonnull NSDictionary) initialState)

@end
