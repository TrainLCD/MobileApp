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

func getRunningStateText(approaching: Bool, stopping: Bool) -> String {
  if (approaching) {
    return NSLocalizedString("soon", comment: "")
  }
  if (stopping) {
    return NSLocalizedString("stop", comment: "")
  }
  return NSLocalizedString("next", comment: "")
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
              Text(getRunningStateText(approaching: context.state.approaching, stopping: context.state.stopping))
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
              Text(getRunningStateText(approaching: context.state.approaching, stopping: context.state.stopping))
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
        Text(getRunningStateText(approaching: context.state.approaching, stopping: context.state.stopping))
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
  @Environment(\.colorScheme) var colorScheme
  
  let context: ActivityViewContext<RideSessionAttributes>
  let isJa = Locale.current.language.languageCode?.identifier == "ja"
  
  var body: some View {
    Group {
      Group{
        if (context.state.stopping) {
          VStack {
            Text(getRunningStateText(approaching: context.state.approaching, stopping: context.state.stopping))
              .bold()
              .font(.caption)
              .multilineTextAlignment(.center)
              .foregroundColor(.accentColor)
            VStack {
              Text(context.state.stationName)
                .bold()
                .multilineTextAlignment(.center)
                .foregroundColor(.accentColor)
              if (!context.state.stationNumber.isEmpty) {
                Text(getStationNumberText(context.state.stationNumber))
                  .font(.caption)
                  .bold()
                  .multilineTextAlignment(.center)
                  .foregroundColor(.accentColor)
              }
            }
            .frame(minWidth: 0, maxWidth: .infinity)
          }
          .padding(8)
        } else {
          VStack {
            Text(getRunningStateText(approaching: context.state.approaching, stopping: context.state.stopping))
              .font(.caption)
              .bold()
              .multilineTextAlignment(.center)
              .foregroundColor(.accentColor)
            HStack {
              VStack {
                Text(context.state.stationName)
                  .opacity(0.75)
                  .multilineTextAlignment(.center)
                  .foregroundColor(.accentColor)
                if (!context.state.nextStationNumber.isEmpty) {
                  Text(getStationNumberText(context.state.stationNumber))
                    .font(.caption)
                    .opacity(0.75)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.accentColor)
                }
              }
              .frame(minWidth: 0, maxWidth: .infinity)
              
              Image(systemName: "arrow.right")
                .foregroundColor(.accentColor)
              
              VStack{
                Text(context.state.nextStationName)
                  .bold()
                  .multilineTextAlignment(.center)
                  .foregroundColor(.accentColor)
                if (!context.state.nextStationNumber.isEmpty) {
                  Text(getStationNumberText(context.state.nextStationNumber))
                    .font(.caption)
                    .bold()
                    .multilineTextAlignment(.center)
                    .foregroundColor(.accentColor)
                }
              }
              .frame(minWidth: 0, maxWidth: .infinity)
            }
          }
          .padding(8)
        }
      }
    }
    .accentColor(colorScheme == ColorScheme.dark ? .white : .black)
    .widgetURL(URL(string: "trainlcd://"))
  }
}
