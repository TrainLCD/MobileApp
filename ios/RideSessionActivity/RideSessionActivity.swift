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

func getRunningStateText(approaching: Bool, stopping: Bool, isNextLastStop: Bool, isPassing: Bool = false) -> String {
  if (isPassing){
    return NSLocalizedString("pass", comment: "")
  }
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
            isNextLastStop: context.state.isNextLastStop,
            isPassing: !context.state.passingStationName.isEmpty
          ))
        .multilineTextAlignment(.trailing)
        .font(.caption)
        .bold()
        .padding(.leading, 8)
      } compactTrailing: {
        if (context.state.stopping) {
          VStack {
            Text(context.state.stationName)
              .font(.caption2)
              .bold()
              .multilineTextAlignment(.center)
            if (!context.state.stationNumber.isEmpty) {
              Text(getStationNumberText(context.state.stationNumber))
                .font(.caption2)
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
          .padding(.trailing, 8)
        } else {
          VStack {
            Text(context.state.passingStationName.isEmpty ? context.state.nextStationName : context.state.passingStationName)
              .font(.caption2)
              .bold()
              .multilineTextAlignment(.center)
            if (!context.state.nextStationNumber.isEmpty || !context.state.passingStationNumber.isEmpty) {
              Text(getStationNumberText(context.state.passingStationName.isEmpty ? context.state.nextStationNumber : context.state.passingStationNumber))
                .font(.caption2)
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
          .padding(.trailing, 8)
        }
      } minimal: {
        Image(systemName: "tram")
      }
    }
    .supplementalActivityFamiliesIfAvailable()
  }
}

struct LockScreenLiveActivityContentView: View {
  @Environment(\.colorScheme) var colorScheme
  let context: ActivityViewContext<RideSessionAttributes>
  let schemeName = Bundle.main.infoDictionary!["CURRENT_SCHEME_NAME"] as? String

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
      .background(Rectangle().fill(colorScheme == .dark ? .black.opacity(0.75) : .white.opacity(0.75)))
      
      if (!context.state.passingStationName.isEmpty) {
        HStack {
          Text(
            String(
              format: NSLocalizedString("passingStation", comment: ""),
              "\(context.state.passingStationName)\(getStationNumberText(context.state.passingStationNumber))"
            )
          )
          .multilineTextAlignment(.center)
          .foregroundColor(.accentColor)
          .bold()
          .font(.caption)
        }
        .padding(.bottom, 8)
      } else {
        HStack {
          if (!context.state.trainTypeName.isEmpty) {
            Text(context.state.trainTypeName)
              .multilineTextAlignment(.center)
              .foregroundColor(.accentColor)
              .bold()
              .font(.caption)
          }
          if (!context.state.boundStationName.isEmpty) {
            Text(
              String(
                format: NSLocalizedString(context.state.isLoopLine ? "boundStationLoopline": "boundStation", comment: ""),
                "\(context.state.boundStationName)\(getStationNumberText(context.state.boundStationNumber))"
              )
            )
            .multilineTextAlignment(.center)
            .foregroundColor(.accentColor)
            .bold()
            .font(.caption)
          }
        }
        .padding(.bottom, 8)
        
      }
    }
    .frame(
      minWidth: 0,
      maxWidth: .infinity,
      minHeight: 0,
      maxHeight: .infinity,
      alignment: .center
    )
    .activityBackgroundTint(colorScheme == .dark ? .black.opacity(0.5) : .white.opacity(0.5))
    .accentColor(colorScheme == .dark ? .white : .black)
    .widgetURL(URL(string: schemeName == "CanaryTrainLCD" ? "trainlcd-canary://" : "trainlcd://"))
  }
}

struct EarlierLockScreenLiveActivityContentView: View {
    let context: ActivityViewContext<RideSessionAttributes>

  var body: some View {
    LockScreenLiveActivityContentView(context: context)
  }
}

@available(iOS 18.0, *)
struct SmartStackLiveActivityContentView: View {
  @Environment(\.colorScheme) var colorScheme
  let context: ActivityViewContext<RideSessionAttributes>
  
  var body: some View {
    ZStack {
      VStack(alignment: .leading) {
        Text(context.state.lineName)
          .font(.caption)
          .bold()
          .multilineTextAlignment(.leading)
          .opacity(0.75)
        Text(getRunningStateText(
          approaching: context.state.approaching,
          stopping: context.state.stopping,
          isNextLastStop: context.state.isNextLastStop
        ))
        .font(.callout)
        .bold()
        .multilineTextAlignment(.leading)
        Text(context.state.stopping ? context.state.stationName : context.state.nextStationName)
          .font(.headline)
          .bold()
          .multilineTextAlignment(.leading)
        if (!context.state.stationNumber.isEmpty) {
          Text(context.state.stopping ? context.state.stationNumber : context.state.nextStationNumber)
            .font(.caption)
            .bold()
            .opacity(0.75)
            .multilineTextAlignment(.leading)
        }
      }
      .frame(
        minWidth: 0,
        maxWidth: .infinity,
        minHeight: 0,
        maxHeight: .infinity,
        alignment: .leading
      )
      .padding(.horizontal, 8)
    }
    .background(
      ZStack {
        Rectangle().fill(Color(hex: context.state.lineColor))
        Rectangle()
          .fill(
            LinearGradient(colors: [.gray, .clear], startPoint: .top, endPoint: .bottom)
              .opacity(0.5)
          )
          .blendMode(.multiply)
      }
    )
  }
}


@available(iOS 18.0, *)
struct NewerLockScreenLiveActivityContentView: View {
  @Environment(\.activityFamily) var activityFamily
  let context: ActivityViewContext<RideSessionAttributes>
  
  var body: some View {
    switch activityFamily {
    case .small:
      SmartStackLiveActivityContentView(context: context)
    case .medium:
      LockScreenLiveActivityContentView(context: context)
    @unknown default:
      LockScreenLiveActivityContentView(context: context)
    }
  }
}

struct LockScreenLiveActivityView: View {
  let context: ActivityViewContext<RideSessionAttributes>
  var body: some View {
    Group {
      if #available(iOS 18.0, *) {
        NewerLockScreenLiveActivityContentView(context: context)
      } else {
        EarlierLockScreenLiveActivityContentView(context: context)
      }
    }
  }
}
