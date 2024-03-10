import { renderHook } from '@testing-library/react-native'
import React, { useEffect } from 'react'
import { RecoilRoot, useSetRecoilState } from 'recoil'
import { TOEI_SHINJUKU_LINE_LOCAL } from '../../__mocks__/fixture/line'
import { TOEI_SHINJUKU_LINE_STATIONS } from '../../__mocks__/fixture/station'
import { setupMockUseNextStation } from '../../__mocks__/useNextStation'
import { StationNumber } from '../../gen/proto/stationapi_pb'
import { setupMockUseNumbering } from '../../src/hooks/useNumbering/__mocks__'
import useTTSText from '../../src/hooks/useTTSText'
import { LineDirection } from '../../src/models/Bound'
import { HeaderStoppingState } from '../../src/models/HeaderTransitionState'
import { AppTheme } from '../../src/models/Theme'
import lineState from '../../src/store/atoms/line'
import navigationState from '../../src/store/atoms/navigation'
import stationState from '../../src/store/atoms/station'
import themeState from '../../src/store/atoms/theme'

jest.mock('../../src/translation', () => ({ isJapanese: true }))

const useTTSTextWithRecoilAndNumbering = (
  theme: AppTheme,
  headerState: HeaderStoppingState
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

    const arrived = headerState === 'CURRENT'
    const approaching = headerState === 'ARRIVING'

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
    setupMockUseNextStation(TOEI_SHINJUKU_LINE_STATIONS[1])
    setupMockUseNumbering([
      new StationNumber({
        lineSymbol: 'S',
        lineSymbolColor: '#B0BF1E',
        lineSymbolShape: 'ROUND',
        stationNumber: 'S-02',
      }),
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
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'Arriving at Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>をご利用のお客様はお乗り換えです。',
        'The next station is Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2. Passengers changing to the Tokyo Metro Marunouchi Line, Tokyo Metro Fukutoshin Line, Please transfer at this station.',
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
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>を出ますと、<sub alias="あけぼのばし">曙橋</sub>に停まります。',
        'We will soon make a brief stop at Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2.',
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
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next station is Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome station number <say-as interpret-as="characters">S</say-as> 2. Transfer here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>を出ますと、次は、<sub alias="あけぼのばし">曙橋</sub>に停まります。',
        'We will soon be making a brief stop at Shinjuku-sanchome station number <say-as interpret-as="characters">S</say-as> 2. Transfer here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line. After leaving Shinjuku-sanchome, We will be stopping at Akebonobashi.',
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
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>は、お乗り換えです。',
        'The next station is Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
        'The next station is Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。 <sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。この電車は、各駅停車、<sub alias="もとやわた">本八幡</sub>ゆきです。',
        'This is the Local train bound for Motoyawata. The next station is Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'We will soon be arriving at Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
        '次は、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'The next stop is Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
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
        'まもなく、<sub alias="しんじゅくさんちょうめ">新宿三丁目</sub>です。<sub alias="とうきょうめとろまるのうちせん">東京メトロ丸ノ内線</sub>、<sub alias="とうきょうめとろふくとしんせん">東京メトロ副都心線</sub>はお乗り換えです。',
        'Arriving at Shinjuku-sanchome <say-as interpret-as="characters">S</say-as> 2. Please change here for the Tokyo Metro Marunouchi Line, and the Tokyo Metro Fukutoshin Line.',
      ])
    })
  })
})
