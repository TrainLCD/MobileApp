import { renderHook } from '@testing-library/react-native'
import React, { useEffect } from 'react'
import { RecoilRoot, useSetRecoilState } from 'recoil'
import { TOEI_SHINJUKU_LINE_LOCAL } from '../../__mocks__/fixture/line'
import { TOEI_SHINJUKU_LINE_STATIONS } from '../../__mocks__/fixture/station'
import { StationNumber } from '../../src/gen/stationapi_pb'
import { setupMockUseCurrentLine } from '../../src/hooks/useCurrentLine/__mocks__'
import { setupMockUseNextStation } from '../../src/hooks/useNextStation/__mocks__'
import { setupMockUseNumbering } from '../../src/hooks/useNumbering/__mocks__'
import useTTSText from '../../src/hooks/useTTSText'
import { LineDirection } from '../../src/models/Bound'
import { HeaderTransitionState } from '../../src/models/HeaderTransitionState'
import { AppTheme } from '../../src/models/Theme'
import lineState from '../../src/store/atoms/line'
import navigationState from '../../src/store/atoms/navigation'
import stationState from '../../src/store/atoms/station'
import themeState from '../../src/store/atoms/theme'

jest.mock('../../src/translation', () => ({ isJapanese: true }))
jest.mock('../../src/hooks/useCurrentLine')
jest.mock('../../src/hooks/useNextStation')
jest.mock('../../src/hooks/useNumbering')

const useTTSTextWithRecoilAndNumbering = (
  theme: AppTheme,
  headerState: HeaderTransitionState
) => {
  const setThemeState = useSetRecoilState(themeState)
  const setLineState = useSetRecoilState(lineState)
  const setStationState = useSetRecoilState(stationState)
  const setNaivgationState = useSetRecoilState(navigationState)

  useEffect(() => {
    const station = TOEI_SHINJUKU_LINE_STATIONS[0]
    const stations = TOEI_SHINJUKU_LINE_STATIONS
    const selectedDirection = 'INBOUND' as LineDirection
    const selectedLine = TOEI_SHINJUKU_LINE_LOCAL
    const selectedBound =
      TOEI_SHINJUKU_LINE_STATIONS[TOEI_SHINJUKU_LINE_STATIONS.length - 1]

    setThemeState((prev) => ({ ...prev, theme }))
    setStationState((prev) => ({
      ...prev,
      station,
      selectedDirection,
      arrived: false,
      selectedBound,
      approaching: false,
      sortedStations: stations,
      fetchStationError: null,
    }))
    setLineState((prev) => ({ ...prev, selectedLine }))
    setNaivgationState((prev) => ({ ...prev, headerState }))
  }, [
    headerState,
    setLineState,
    setNaivgationState,
    setStationState,
    setThemeState,
    theme,
  ])

  const texts = useTTSText(false)
  return texts
}

// TODO: firstSpeech refの動作検証が取れていないので後でfirstSpeechも対象にして実施する
describe('Without trainType & With numbering', () => {
  beforeAll(() => {
    setupMockUseCurrentLine(TOEI_SHINJUKU_LINE_LOCAL)
    setupMockUseNextStation(TOEI_SHINJUKU_LINE_STATIONS[1])
    setupMockUseNumbering([
      {
        lineSymbol: 'S',
        lineSymbolColor: '#B0BF1E',
        lineSymbolShape: 'ROUND',
        stationNumber: 'S-2',
      } as StationNumber.AsObject,
      '',
    ])
  })

  describe('TOKYO_METRO Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('TOKYO_METRO', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        '次は<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。',
        'The next stop is Shinjuku-sanchome S-2.',
      ])
    })
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('TOKYO_METRO', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。',
        'Arriving at Shinjuku-sanchome, S-2.',
      ])
    })
  })

  describe('TY Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('TY', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        '次は<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>をご利用のお客様はお乗り換えです。',
        'The next station is Shinjuku-sanchome S-2. Passengers changing to the Tokyo Metro Marunouchi Line, Tokyo Metro Fukutoshin Line, Please transfer at this station.',
      ])
    })
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('TY', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        'まもなく<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。',
        'We will soon make a brief stop at Shinjuku-sanchome S-2.',
      ])
    })
  })

  describe('YAMANOTE Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('YAMANOTE', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        '次は<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next station is Shinjuku-sanchome S-2. Please change here for the Tokyo Metro Marunouchi Line and the Tokyo Metro Fukutoshin Line.',
      ])
    })
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('YAMANOTE', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual(['', ''])
    })
  })

  describe('JR_WEST Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('JR_WEST', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        '次は<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。',
        'The next stop is Shinjuku-sanchome, station number S-2.',
      ])
    })
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('JR_WEST', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        'まもなく<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。',
        'We will soon be making a brief stop at Shinjuku-sanchome, station number S-2. After leaving Shinjuku-sanchome.',
      ])
    })
  })

  describe('SAIKYO Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('SAIKYO', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        '次は<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next station is Shinjuku-sanchome, S-2. Please change here for the Tokyo Metro Marunouchi Line and the Tokyo Metro Fukutoshin Line.',
      ])
    })
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('SAIKYO', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>は、お乗り換えです。',
        'The next station is Shinjuku-sanchome, S-2. Please change here for the Tokyo Metro Marunouchi Line and the Tokyo Metro Fukutoshin Line.',
      ])
    })
  })

  describe('TOEI Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('TOEI', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        '次は<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。この電車は、各駅停車、<sub alias="もとやわた">本八幡</sub>ゆきです。',
        'The next stop is Shinjuku-sanchome S-2.',
      ])
    })
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('TOEI', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。',
        'Arriving at Shinjuku-sanchome, S-2.',
      ])
    })
  })

  describe('LED Theme', () => {
    test('should be NEXT', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('LED', 'NEXT'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        '次は<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。',
        'The next stop is Shinjuku-sanchome S-2.',
      ])
    })
    test('should be ARRIVING', () => {
      const { result } = renderHook(
        () => useTTSTextWithRecoilAndNumbering('LED', 'ARRIVING'),
        {
          wrapper: ({ children }) => <RecoilRoot>{children}</RecoilRoot>,
        }
      )
      expect(result.current).toEqual([
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。',
        'Arriving at Shinjuku-sanchome, S-2.',
      ])
    })
  })
})
