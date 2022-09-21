//
//  RideSessionActivity.swift
//  RideSessionActivity
//
//  Created by Tsubasa SEKIGUCHI on 2022/09/15.
//  Copyright © 2022 Facebook. All rights reserved.
//

import WidgetKit
import SwiftUI

func getStationNumberText(_ stationNumber: String) -> String {
  if (stationNumber.isEmpty) {
    return ""
  }
  return "(\(stationNumber))"
}

@main
struct RideSessionWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RideSessionAttributes.self) { context in
      LockScreenLiveActivityView(context: context)
    } dynamicIsland: {context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Group {
            if (context.state.stopping) {
              EmptyView()
            } else {
              VStack(alignment: .center) {
                Text(getStationNumberText(context.state.stationNumber))
                  .font(.caption)
                Text(context.state.stationName)
              }
            }
          }
        }
        
        DynamicIslandExpandedRegion(.trailing) {
          Group {
            if (context.state.stopping) {
              EmptyView()
            } else {
              VStack(alignment: .center) {
                Text(getStationNumberText(context.state.nextStationNumber))
                  .font(.caption)
                  .fontWeight(.bold)
                Text(context.state.nextStationName)
                  .fontWeight(.bold)
              }
            }
          }
        }
        
        DynamicIslandExpandedRegion(.center) {
          Group {
            if (context.state.stopping) {
              VStack(alignment: .center ) {
                Text(context.state.runningState)
                  .fontWeight(.bold)
                Text("\(context.state.stationName)\(getStationNumberText(context.state.stationNumber))")
                  .fontWeight(.bold)
              }
            } else {
              VStack(alignment: .center) {
                Text(context.state.runningState)
                  .fontWeight(.bold)
                Image(systemName: "arrow.right")
                  .foregroundColor(.white)
              }
            }
          }
        }
        
        DynamicIslandExpandedRegion(.bottom) {
          EmptyView()
        }
      } compactLeading: {
        Group {
          if (context.state.stopping) {
            Text(context.state.runningState)
              .font(.caption2)
          } else {
            Text("\(context.state.stationName)\(getStationNumberText(context.state.stationNumber))")
              .font(.caption2)
          }
        }
      } compactTrailing: {
        Group {
          if (context.state.stopping) {
            Text("\(context.state.stationName)\(getStationNumberText(context.state.stationNumber))")
              .font(.caption2)
              .fontWeight(.bold)
          } else {
            Label {
              Text("\(context.state.nextStationName)\(getStationNumberText(context.state.stationNumber))")
            } icon: {
              Image(systemName: "arrow.right")
                .foregroundColor(.white)
            }
            .font(.caption2)
            .fontWeight(.bold)
          }
        }
      } minimal: {
        EmptyView()
      }
    }
  }
}
          
struct LockScreenLiveActivityView: View {
  let context: ActivityViewContext<RideSessionAttributes>
  let customBlack = Color(hex: "181818e6") // E6 = 90%
  let customWhite = Color(hex: "f2f2f2")

  var body: some View {
    Group {
      if (context.state.stopping) {
        VStack(alignment: .center) {
          Text(context.state.runningState)
            .fontWeight(.bold)
            VStack {
              Text("\(context.state.stationName)\(getStationNumberText(context.state.stationNumber))")
                .fontWeight(.bold)
            }
          .frame(minWidth: 0, maxWidth: .infinity)
        }
        .foregroundColor(customWhite)
        .activitySystemActionForegroundColor(customWhite)
        .activityBackgroundTint(customBlack)
      } else {
        VStack(alignment: .center) {
          Text(context.state.runningState)
            .fontWeight(.bold)
          HStack {
            VStack {
              Text("\(context.state.stationName)\(getStationNumberText(context.state.stationNumber))")
                .frame(minWidth: 0, maxWidth: .infinity, alignment: .center)
              
            }
            .frame(minWidth: 0, maxWidth: .infinity)
            
            Image(systemName: "arrow.right")
              .foregroundColor(customWhite)
            
            VStack{
              Text("\(context.state.nextStationName)\(getStationNumberText(context.state.nextStationNumber))")
                .fontWeight(.bold)
                .frame(minWidth: 0, maxWidth: .infinity, alignment: .center)
            }
          }
          .frame(minWidth: 0, maxWidth: .infinity)
        }
        .foregroundColor(customWhite)
        .activitySystemActionForegroundColor(customWhite)
        .activityBackgroundTint(customBlack)
      }
    }
  }
}
