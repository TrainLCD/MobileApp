//
//  RideSessionActivity.swift
//  RideSessionActivity
//
//  Created by Tsubasa SEKIGUCHI on 2022/09/15.
//  Copyright © 2022 Facebook. All rights reserved.
//

import SwiftUI
import WidgetKit

struct StationNumberGaugeView: View {
  let stationNumber: String
  let nextStationNumber: String
  let lineColor: String
  let progress: Double
  let stopped: Bool

  private var displayNumber: String {
    let number = stopped ? stationNumber : nextStationNumber
    if number.isEmpty {
      return ""
    }
    // ハイフンを削除して路線記号+番号を表示（例: E-31 → E31）
    return number.replacingOccurrences(of: "-", with: "")
  }

  private var gaugeColor: Color {
    // TODO: デバッグ用 - 赤色で表示されるか確認後に削除
    return .red
    // if lineColor.isEmpty {
    //   return .white
    // }
    // return Color(hex: lineColor)
  }

  var body: some View {
    ZStack {
      // 背景の円（グレー）
      Circle()
        .stroke(Color.gray.opacity(0.3), lineWidth: 3)

      // プログレスの円弧
      Circle()
        .trim(from: 0, to: 1.0)  // TODO: デバッグ用 - progressを1.0に固定
        .stroke(
          gaugeColor,
          style: StrokeStyle(lineWidth: 3, lineCap: .round)
        )

      // 中央の駅ナンバー表示
      if !displayNumber.isEmpty {
        Text(displayNumber)
          .font(.system(size: 10, weight: .bold, design: .rounded))
          .minimumScaleFactor(0.5)
      } else {
        Image("AppIcon")
          .resizable()
          .scaledToFit()
          .frame(width: 14, height: 14)
      }
    }
    .frame(width: 24, height: 24)
  }
}

// NOTE: 通過中の値を追加するとなぜかライブアクティビティが死ぬので含めていない
// ちなみにライブアクティビティにスピナーが表示され固まる
func getRunningStateText(
  approaching: Bool, stopped: Bool, isNextLastStop: Bool, isDynamicIsland: Bool = false
) -> String {
  if !stopped && !approaching {
    if isNextLastStop {
      return String(localized: "nextLast")
    }
    return String(localized: "next")
  }

  if stopped {
    if isDynamicIsland {
      return String(localized: "stop")
    }
    return String(localized: "nowStoppingAt")
  }

  if approaching {
    if isNextLastStop {
      return String(localized: "soonLast")
    }
    return String(localized: "soon")
  }

  if isNextLastStop {
    return String(localized: "nextLast")
  }
  return ""
}

@main
struct RideSessionWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RideSessionAttributes.self) { context in
      LockScreenLiveActivityView(context: context)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          if context.state.stopped || context.state.nextStationName.isEmpty {
            EmptyView()
          } else {
            VStack(alignment: .center) {
              Text(context.state.stationName)
                .font(.callout)
                .opacity(0.5)
                .multilineTextAlignment(.center)
              if !context.state.stationNumber.isEmpty {
                Text(context.state.stationNumber)
                  .font(.caption)
                  .opacity(0.5)
                  .multilineTextAlignment(.center)
              }
            }
          }
        }

        DynamicIslandExpandedRegion(.trailing) {
          if context.state.stopped || context.state.nextStationName.isEmpty {
            EmptyView()
          } else {
            VStack(alignment: .center) {
              Text(context.state.nextStationName)
                .font(.callout)
                .bold()
                .multilineTextAlignment(.center)
              if !context.state.nextStationNumber.isEmpty {
                Text(context.state.nextStationNumber)
                  .font(.caption)
                  .bold()
                  .multilineTextAlignment(.center)
              }
            }
          }
        }

        DynamicIslandExpandedRegion(.center) {
          if context.state.stopped || context.state.nextStationName.isEmpty {
            VStack(alignment: .center) {
              Text(
                getRunningStateText(
                  approaching: context.state.approaching,
                  stopped: context.state.stopped,
                  isNextLastStop: context.state.isNextLastStop,
                  isDynamicIsland: true
                )
              )
              .bold()
              .font(.caption)
              .multilineTextAlignment(.center)
              Text(context.state.stationName)
                .bold()
                .multilineTextAlignment(.center)
              if !context.state.stationNumber.isEmpty {
                Text(context.state.stationNumber)
                  .font(.caption)
                  .bold()
                  .multilineTextAlignment(.center)
              }
            }
          } else {
            VStack(alignment: .center) {
              Text(
                getRunningStateText(
                  approaching: context.state.approaching,
                  stopped: context.state.stopped,
                  isNextLastStop: context.state.isNextLastStop,
                  isDynamicIsland: true
                )
              )
              .bold()
              .font(.caption)
              .multilineTextAlignment(.center)
              if !context.state.passingStationName.isEmpty {
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
        HStack {
          if context.state.approaching {
            EmptyView()
          } else if context.state.stopped
            || context.state.nextStationName.isEmpty
          {
            Image(systemName: "stop.circle")
          }

          if context.state.passingStationName.isEmpty {
            Text(
              getRunningStateText(
                approaching: context.state.approaching,
                stopped: context.state.stopped,
                isNextLastStop: context.state.isNextLastStop,
                isDynamicIsland: true
              )
            )
            .font(.caption)
            .bold()
            .multilineTextAlignment(.center)
          } else {
            Text("pass")
          }

          if !context.state.passingStationName.isEmpty
            || (context.state.stopped && !context.state.approaching)
          {
            EmptyView()
          } else if context.state.isNextLastStop {
            Image(systemName: "chevron.forward.to.line")
          } else {
            Image(systemName: "chevron.forward")
          }
        }
        .frame(maxWidth: .infinity)
        .padding(.leading, 8)
      } compactTrailing: {
        Group {
          if !context.state.passingStationName.isEmpty {
            HStack {
              VStack(spacing: 0) {
                Text(
                  context.state.passingStationName
                )
                .font(.caption)
                .bold()
                .multilineTextAlignment(.center)
                .opacity(0.75)

                if !context.state.passingStationNumber.isEmpty {
                  Text(context.state.passingStationNumber)
                    .font(.footnote)
                    .bold()
                    .multilineTextAlignment(.center)
                    .opacity(0.75)
                }
              }

              Image(systemName: "chevron.forward.dotted.chevron.forward")
            }
          } else if context.state.stopped
            || context.state.nextStationName.isEmpty
          {
            VStack(spacing: 0) {
              Text(
                context.state.stationName
              )
              .font(.caption)
              .bold()
              .multilineTextAlignment(.center)

              if !context.state.stationNumber.isEmpty {
                Text(
                  context.state.stationNumber
                )
                .font(.footnote)
                .bold()
                .multilineTextAlignment(.center)
              }
            }
          } else {
            VStack(spacing: 0) {
              Text(
                context.state.nextStationName
              )
              .font(.caption)
              .bold()
              .multilineTextAlignment(.center)

              if !context.state.nextStationNumber.isEmpty {
                Text(
                  context.state.nextStationNumber
                )
                .font(.footnote)
                .bold()
                .multilineTextAlignment(.center)
              }
            }
          }
        }
        .frame(maxWidth: .infinity)
        .padding(.trailing, 8)
      } minimal: {
        StationNumberGaugeView(
          stationNumber: context.state.stationNumber,
          nextStationNumber: context.state.nextStationNumber,
          lineColor: context.state.lineColor,
          progress: context.state.progress,
          stopped: context.state.stopped
        )
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
        if context.state.stopped || context.state.nextStationName.isEmpty {
          VStack {
            Text(
              getRunningStateText(
                approaching: context.state.approaching,
                stopped: context.state.stopped,
                isNextLastStop: context.state.isNextLastStop
              )
            )
            .bold()
            .font(.caption)
            .multilineTextAlignment(.center)
            .foregroundColor(.accentColor)
            VStack {
              Text(context.state.stationName)
                .bold()
                .multilineTextAlignment(.center)
                .foregroundColor(.accentColor)
              if !context.state.stationNumber.isEmpty {
                Text(context.state.stationNumber)
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
            Text(
              getRunningStateText(
                approaching: context.state.approaching,
                stopped: context.state.stopped,
                isNextLastStop: context.state.isNextLastStop
              )
            )
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
                if !context.state.stationNumber.isEmpty {
                  Text(context.state.stationNumber)
                    .font(.caption)
                    .opacity(0.75)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.accentColor)
                }
              }
              .frame(minWidth: 0, maxWidth: .infinity)

              Image(systemName: "arrow.right")
                .foregroundColor(.accentColor)
              VStack {
                Text(context.state.nextStationName)
                  .bold()
                  .multilineTextAlignment(.center)
                  .foregroundColor(.accentColor)
                if !context.state.nextStationNumber.isEmpty {
                  Text(context.state.nextStationNumber)
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
      .background(
        Rectangle().fill(
          colorScheme == .dark ? .black.opacity(0.75) : .white.opacity(0.75)))

      if context.state.passingStationName.isEmpty {
        HStack {
          if !context.state.trainTypeName.isEmpty {
            Text(context.state.trainTypeName)
              .multilineTextAlignment(.center)
              .foregroundColor(.accentColor)
              .bold()
              .font(.caption)
          }
          if !context.state.boundStationName.isEmpty {
            Text(
              String(
                format: String(
                  localized:
                    context.state.isLoopLine
                    ? "boundStationLoopline" : "boundStation"),
                context.state.boundStationNumber.isEmpty
                  ? "\(context.state.boundStationName)"
                  : "\(context.state.boundStationName)(\(context.state.boundStationNumber))"
              )
            )
            .multilineTextAlignment(.center)
            .foregroundColor(.accentColor)
            .bold()
            .font(.caption)
          }
        }
        .padding(.bottom, 8)
      } else {
        HStack {
          Text(
            String(
              format: String(localized: "passingStation"),
              context.state.passingStationNumber.isEmpty
                ? "\(context.state.passingStationName)"
                : "\(context.state.passingStationName)(\(context.state.passingStationNumber))"
            )
          )
          .multilineTextAlignment(.center)
          .foregroundColor(.accentColor)
          .bold()
          .font(.caption)
        }
        .padding(.bottom, 8)
      }
    }
    .activityBackgroundTint(
      colorScheme == .dark ? .black.opacity(0.5) : .white.opacity(0.5)
    )
    .accentColor(colorScheme == .dark ? .white : .black)
    .widgetURL(
      URL(
        string: schemeName == "CanaryTrainLCD"
          ? "trainlcd-canary://" : "trainlcd://"))
  }
}

struct EarlierLockScreenLiveActivityContentView: View {
  let context: ActivityViewContext<RideSessionAttributes>

  var body: some View {
    LockScreenLiveActivityContentView(context: context)
  }
}

struct SmartStackLiveActivityContentView: View {
  let context: ActivityViewContext<RideSessionAttributes>

  private func updatedTime() -> String {
    DateFormatter.localizedString(
      from: Date(), dateStyle: .none, timeStyle: .short)
  }

  var body: some View {
    ZStack {
      VStack(alignment: .leading) {
        HStack(spacing: 2) {
          Text(context.state.lineName)
            .font(.caption)
            .bold()
            .multilineTextAlignment(.leading)
            .opacity(0.75)
          Text(context.state.trainTypeName)
            .font(.caption)
            .bold()
            .multilineTextAlignment(.leading)
            .opacity(0.75)
        }
        HStack {
          VStack {
            Text(context.state.stationName)
              .font(.headline)
              .bold()
              .multilineTextAlignment(.leading)
            if !context.state.stationNumber.isEmpty {
              Text(context.state.stationNumber)
                .font(.caption)
                .bold()
                .opacity(0.75)
                .multilineTextAlignment(.leading)
            }
          }
          if !context.state.nextStationName.isEmpty {
            Image(systemName: "arrow.right")
              .foregroundColor(.white)
          }
          VStack {
            Text(context.state.nextStationName)
              .font(.headline)
              .bold()
              .multilineTextAlignment(.leading)
            if !context.state.stationNumber.isEmpty {
              Text(context.state.nextStationNumber)
                .font(.caption)
                .bold()
                .opacity(0.75)
                .multilineTextAlignment(.leading)
            }
          }
        }
        Text(
          "\(String(localized: "lastUpdated")): \(updatedTime())"
        )
        .font(.caption)
        .bold()
        .opacity(0.75)
        .multilineTextAlignment(.leading)
      }.frame(
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
            LinearGradient(
              colors: [.gray, .clear], startPoint: .top, endPoint: .bottom
            )
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
      EmptyView()
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
