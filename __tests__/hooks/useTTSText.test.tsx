import { renderHook } from '@testing-library/react-native'
import React, { useEffect } from 'react'
import { RecoilRoot, useSetRecoilState } from 'recoil'
import { TRAINING_CENTRAL_LINE_FIXTURE } from '../../__mocks__/fixture/line'
import {
  TRAINING_LINE_STATIONS_FIXTURE_EXPRESS,
  TRAINING_LINE_STATIONS_FIXTURE_LOCAL,
} from '../../__mocks__/fixture/station'
import { TRAINING_EXPRESS_FIXTURE } from '../../__mocks__/fixture/trainType'
import { Line, Station, TrainType } from '../../gen/proto/stationapi_pb'
import useTTSText from '../../src/hooks/useTTSText'
import { LineDirection } from '../../src/models/Bound'
import { HeaderStoppingState } from '../../src/models/HeaderTransitionState'
import { AppTheme } from '../../src/models/Theme'
import lineState from '../../src/store/atoms/line'
import navigationState from '../../src/store/atoms/navigation'
import stationState from '../../src/store/atoms/station'
import themeState from '../../src/store/atoms/theme'

jest.mock('../../src/translation', () => ({ isJapanese: true }))

const useTTSTextWithFixture = (
  theme: AppTheme,
  headerState: HeaderStoppingState,
  trainType: TrainType | null = null
) => {
  const setThemeState = useSetRecoilState(themeState)
  const setLineState = useSetRecoilState(lineState)
  const setStationState = useSetRecoilState(stationState)
  const setNavigationState = useSetRecoilState(navigationState)

  useEffect(() => {
    const station = TRAINING_LINE_STATIONS_FIXTURE_LOCAL[
      TRAINING_LINE_STATIONS_FIXTURE_LOCAL.length / 2 - 1
    ] as Station
    const stations = (
      trainType
        ? TRAINING_LINE_STATIONS_FIXTURE_EXPRESS
        : TRAINING_LINE_STATIONS_FIXTURE_LOCAL
    ) as Station[]
    const selectedDirection = 'INBOUND' as LineDirection
    const selectedLine = TRAINING_CENTRAL_LINE_FIXTURE as Line
    const selectedBound = stations[stations.length - 1] as Station | undefined

    const arrived = headerState === 'CURRENT'
    const approaching = headerState === 'ARRIVING'

    if (!selectedBound) {
      return
    }

    setThemeState((prev) => ({ ...prev, theme }))
    setStationState((prev) => ({
      ...prev,
      station,
      stations,
      selectedDirection,
      arrived,
      selectedBound,
      approaching,
    }))
    setLineState((prev) => ({ ...prev, selectedLine }))
    setNavigationState((prev) => ({ ...prev, trainType }))
  }, [
    headerState,
    setLineState,
    setNavigationState,
    setStationState,
    setThemeState,
    theme,
    trainType,
  ])

  const texts = useTTSText(true)
  return texts
}

describe('TOKYO_METRO Theme', () => {
  it.each([
    {
      stoppingState: 'NEXT',
      firstSpeech: true,
      expected: {
        jaText:
          '<speak>お待たせいたしました。<sub alias="くんれんちゅうおうせん">訓練中央線</sub>をご利用いただきまして、ありがとうございます。次は<sub alias="くんれん6">訓練6</sub>です。<sub alias="くんれんにしせん">訓練西線</sub>、<sub alias="くんれんほくせいせん">訓練北西線</sub>はお乗り換えです。この電車は、<sub alias="くんれんこうがいせん">訓練郊外線</sub>直通、<sub alias="きゅうこう">急行</sub>、<sub alias="くんれんこうがい2">訓練郊外2</sub>ゆきです。</speak>',
        enText:
          '<speak>This train is bound for Training Suburb 2 S-2 on the Training Suburb Line. The next station is Training 6 T-6. The next stop after Training 6 is Training 7. Please change here for the Training West Line, and the Training Northwest Line.</speak>',
      },
    },
  ])('stoppingState: $stoppingState', ({ stoppingState, expected }) => {
    const { result } = renderHook(
      () =>
        useTTSTextWithFixture(
          'TOKYO_METRO',
          stoppingState as HeaderStoppingState,
          TRAINING_EXPRESS_FIXTURE as TrainType
        ),
      {
        wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
      }
    )
    expect(result.current).toEqual([expected.jaText, expected.enText])
  })
})
