//
//  RideSessionActivity.swift
//  RideSessionActivity
//
//  Created by Tsubasa SEKIGUCHI on 2022/09/15.
//  Copyright © 2022 Facebook. All rights reserved.
//

#if canImport(ActivityKit)
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
                Text(context.state.stationName)
                  .font(.callout)
                if (!context.state.stationNumber.isEmpty) {
                  Text(getStationNumberText(context.state.stationNumber))
                    .font(.caption)
                }
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
                Text(context.state.nextStationName)
                  .font(.callout)
                  .bold()
                if (!context.state.nextStationNumber.isEmpty) {
                  Text(getStationNumberText(context.state.nextStationNumber))
                    .font(.caption)
                    .bold()
                }
              }
            }
          }
        }
        
        DynamicIslandExpandedRegion(.center) {
          Group {
            if (context.state.stopping) {
              VStack(alignment: .center ) {
                Text(context.state.runningState)
                  .bold()
                Text(context.state.stationName)
                  .bold()
                if (!context.state.stationNumber.isEmpty) {
                  Text(getStationNumberText(context.state.stationNumber))
                    .font(.caption)
                    .bold()
                }
              }
            } else {
              VStack(alignment: .center) {
                Text(context.state.runningState)
                  .bold()
                  .font(.caption)
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
        Text(context.state.runningState)
          .font(.caption)
          .bold()
      } compactTrailing: {
        Group {
          if (context.state.stopping) {
            VStack {
              Text(context.state.stationName)
                .font(.caption)
                .bold()
              if (!context.state.stationNumber.isEmpty) {
                Text(getStationNumberText(context.state.stationNumber))
                  .font(.caption)
                  .bold()
              }
            }
          } else {
            VStack {
              Text(context.state.nextStationName)
                .font(.caption)
                .bold()
              if (!context.state.nextStationNumber.isEmpty) {
                Text(getStationNumberText(context.state.nextStationNumber))
                  .font(.caption)
                  .bold()
              }
            }
          }
        }.frame(width: 85)
      } minimal: {
        EmptyView()
      }
    }
  }
}

struct LockScreenLiveActivityView: View {
  let context: ActivityViewContext<RideSessionAttributes>

  var body: some View {
    Group {
      if (context.state.stopping) {
        VStack {
          Text(context.state.runningState)
            .bold()
            .font(.caption)
            VStack {
              Text(context.state.stationName)
                .bold()
              if (!context.state.stationNumber.isEmpty) {
                Text(getStationNumberText(context.state.stationNumber))
                  .font(.caption)
                  .bold()
              }
            }
          .frame(minWidth: 0, maxWidth: .infinity)
        }
      } else {
        VStack {
          Text(context.state.runningState)
            .font(.caption)
            .bold()
          HStack {
            VStack {
              Text(context.state.stationName)
                .opacity(0.5)
              if (!context.state.nextStationNumber.isEmpty) {
                Text(getStationNumberText(context.state.stationNumber))
                  .font(.caption)
                  .opacity(0.5)
              }
            }
            .frame(minWidth: 0, maxWidth: .infinity)
            
            Image(systemName: "arrow.right")
            
            VStack{
              Text(context.state.nextStationName)
                .bold()
              if (!context.state.nextStationNumber.isEmpty) {
                Text(getStationNumberText(context.state.nextStationNumber))
                  .font(.caption)
                  .bold()
              }
            }
            .frame(minWidth: 0, maxWidth: .infinity)
          }
        }
      }
    }.widgetURL(URL(string: "trainlcd://"))
  }
}
#endif
