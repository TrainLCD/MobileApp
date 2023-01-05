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

func getRunningStateText(approaching: Bool, stopping: Bool, isNextLastStop: Bool) -> String {
  if (approaching) {
    if (isNextLastStop) {
      return NSLocalizedString("soonLast", comment: "")
    }
    return NSLocalizedString("soon", comment: "")
  }
  if (stopping) {
    return NSLocalizedString("stop", comment: "")
  }
  if (isNextLastStop) {
    return NSLocalizedString("nextLast", comment: "")
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
              Text(getRunningStateText(
                approaching: context.state.approaching,
                stopping: context.state.stopping,
                isNextLastStop: context.state.isNextLastStop
              ))
              .bold()
              .font(.caption)
              .multilineTextAlignment(.center)
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
          } else {
            VStack(alignment: .center) {
              Text(getRunningStateText(
                approaching: context.state.approaching,
                stopping: context.state.stopping,
                isNextLastStop: context.state.isNextLastStop
              ))
              .bold()
              .font(.caption)
              .multilineTextAlignment(.center)
              Image(systemName: "arrow.right")
                .foregroundColor(.white)
              if (!context.state.passingStationName.isEmpty) {
                HStack {
                  Text(
                    String(
                      format: NSLocalizedString("passingStation", comment: ""),
                      "\(context.state.passingStationName)\(getStationNumberText(context.state.passingStationNumber))"
                    )
                  )
                  .font(.caption)
                  .bold()
                  .multilineTextAlignment(.center)
                }
                .padding(.top, 4)
              }
            }
          }
        }
        
        DynamicIslandExpandedRegion(.bottom) {
          EmptyView()
        }
      } compactLeading: {
        Text(
          getRunningStateText(
            approaching: context.state.approaching,
            stopping: context.state.stopping,
            isNextLastStop: context.state.isNextLastStop
          ))
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
  
  var body: some View {
    VStack {
      Group {
        if (context.state.stopping) {
          VStack {
            Text(getRunningStateText(
              approaching: context.state.approaching,
              stopping: context.state.stopping,
              isNextLastStop: context.state.isNextLastStop
            ) )
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
            Text(getRunningStateText(
              approaching: context.state.approaching,
              stopping: context.state.stopping,
              isNextLastStop: context.state.isNextLastStop
            ))
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
      .background(Rectangle().fill(colorScheme == .dark ? Color.init(hex: "#212121") : Color.init(hex: "#EEEEEE")))
      
      if (!context.state.passingStationName.isEmpty) {
        HStack {
          Text(
            String(
              format: NSLocalizedString("passingStation", comment: ""),
              "\(context.state.passingStationName)\(getStationNumberText(context.state.passingStationNumber))"
            )
          )
          .font(.caption)
          .bold()
          .multilineTextAlignment(.center)
          .foregroundColor(.accentColor)
        }
        .padding(.bottom, 8)
        .opacity(0.75)
      } else {
        HStack {
          if (!context.state.trainTypeName.isEmpty) {
            Text(context.state.trainTypeName)
              .bold()
              .font(.caption)
              .foregroundColor(.accentColor)
          }
          if (!context.state.boundStationName.isEmpty) {
            Text(
              String(
                format: NSLocalizedString(context.state.isLoopLine ? "boundStationLoopline": "boundStation", comment: ""),
                "\(context.state.boundStationName)\(getStationNumberText(context.state.boundStationNumber))"
              )
            )
            .foregroundColor(.accentColor)
            .bold()
            .font(.caption)
          }
        }
        .padding(.bottom, 8)
        .opacity(0.75)
      }
    }
    .frame(
      minWidth: 0,
      maxWidth: .infinity,
      minHeight: 0,
      maxHeight: .infinity,
      alignment: .center
    )
    .accentColor(colorScheme == ColorScheme.dark ? .white : .black)
    .widgetURL(URL(string: "trainlcd://"))
  }
}
