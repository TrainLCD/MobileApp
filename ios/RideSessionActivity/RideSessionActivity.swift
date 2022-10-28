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
          if (context.state.stopping) {
            EmptyView()
          } else {
            VStack(alignment: .center) {
              Text(context.state.stationName)
                .font(.callout)
                .opacity(0.5)
                .multilineTextAlignment(.center)
              if (!context.state.stationNumber.isEmpty) {
                Text(getStationNumberText(context.state.stationNumber))
                  .font(.caption)
                  .opacity(0.5)
                  .multilineTextAlignment(.center)
              }
            }
          }
        }
        
        DynamicIslandExpandedRegion(.trailing) {
          if (context.state.stopping) {
            EmptyView()
          } else {
            VStack(alignment: .center) {
              Text(context.state.nextStationName)
                .font(.callout)
                .bold()
                .multilineTextAlignment(.center)
              if (!context.state.nextStationNumber.isEmpty) {
                Text(getStationNumberText(context.state.nextStationNumber))
                  .font(.caption)
                  .bold()
                  .multilineTextAlignment(.center)
              }
            }
          }
        }
        
        DynamicIslandExpandedRegion(.center) {
          if (context.state.stopping) {
            VStack(alignment: .center ) {
              Text(context.state.runningState)
                .bold()
                .font(.caption)
                .multilineTextAlignment(.center)
              Text(context.state.stationName)
                .bold()
                .multilineTextAlignment(.center)
                .multilineTextAlignment(.center)
              if (!context.state.stationNumber.isEmpty) {
                Text(getStationNumberText(context.state.stationNumber))
                  .font(.caption)
                  .bold()
                  .multilineTextAlignment(.center)
              }
            }
          } else {
            VStack(alignment: .center) {
              Text(context.state.runningState)
                .bold()
                .font(.caption)
                .multilineTextAlignment(.center)
              Image(systemName: "arrow.right")
                .foregroundColor(.white)
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
        if (context.state.stopping) {
          VStack {
            Text(context.state.stationName)
              .font(.caption)
              .bold()
              .multilineTextAlignment(.center)
            if (!context.state.stationNumber.isEmpty) {
              Text(getStationNumberText(context.state.stationNumber))
                .font(.caption)
                .bold()
                .multilineTextAlignment(.center)
            }
          }
          .frame(
            minWidth: 0,
            maxWidth: .infinity,
            minHeight: 0,
            maxHeight: .infinity,
            alignment: .center
          )
        } else {
          VStack {
            Text(context.state.nextStationName)
              .font(.caption)
              .bold()
              .multilineTextAlignment(.center)
            if (!context.state.nextStationNumber.isEmpty) {
              Text(getStationNumberText(context.state.nextStationNumber))
                .font(.caption)
                .bold()
                .multilineTextAlignment(.center)
            }
          }
          .frame(
            minWidth: 0,
            maxWidth: .infinity,
            minHeight: 0,
            maxHeight: .infinity,
            alignment: .center
          )
        }
      } minimal: {
        Image(systemName: "tram")
      }.keylineTint(.cyan)
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
            .multilineTextAlignment(.center)
          VStack {
            Text(context.state.stationName)
              .bold()
              .multilineTextAlignment(.center)
            if (!context.state.stationNumber.isEmpty) {
              Text(getStationNumberText(context.state.stationNumber))
                .font(.caption)
                .bold()
                .multilineTextAlignment(.center)
            }
          }
          .frame(minWidth: 0, maxWidth: .infinity)
        }
      } else {
        VStack {
          Text(context.state.runningState)
            .font(.caption)
            .bold()
            .multilineTextAlignment(.center)
          HStack {
            VStack {
              Text(context.state.stationName)
                .opacity(0.5)
                .multilineTextAlignment(.center)
              if (!context.state.nextStationNumber.isEmpty) {
                Text(getStationNumberText(context.state.stationNumber))
                  .font(.caption)
                  .opacity(0.5)
                  .multilineTextAlignment(.center)
              }
            }
            .frame(minWidth: 0, maxWidth: .infinity)
            
            Image(systemName: "arrow.right")
            
            VStack{
              Text(context.state.nextStationName)
                .bold()
                .multilineTextAlignment(.center)
              if (!context.state.nextStationNumber.isEmpty) {
                Text(getStationNumberText(context.state.nextStationNumber))
                  .font(.caption)
                  .bold()
                  .multilineTextAlignment(.center)
              }
            }
            .frame(minWidth: 0, maxWidth: .infinity)
          }
        }
      }
    }.widgetURL(URL(string: "trainlcd://"))
  }
}
