import { ConnectError } from '@connectrpc/connect'
import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRecoilValue } from 'recoil'
import { Station, TrainType } from '../../gen/proto/stationapi_pb'
import { LED_THEME_BG_COLOR } from '../constants'
import { useThemeStore } from '../hooks/useThemeStore'
import { APP_THEME } from '../models/Theme'
import lineState from '../store/atoms/line'
import { isJapanese, translate } from '../translation'
import dropEitherJunctionStation from '../utils/dropJunctionStation'
import getIsPass from '../utils/isPass'
import isTablet from '../utils/isTablet'
import { RFValue } from '../utils/rfValue'
import Button from './Button'
import Heading from './Heading'
import Typography from './Typography'

type Props = {
  trainType: TrainType | null
  stations: Station[]
  loading: boolean
  disabled?: boolean
  error: ConnectError | null
  onClose: () => void
  onConfirmed: (trainType: TrainType | undefined) => void
}

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    height: '100%',
  },
  container: {
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 16,
  },
})

const SAFE_AREA_FALLBACK = 32

export const TrainTypeInfoPage: React.FC<Props> = ({
  trainType,
  stations,
  loading,
  disabled,
  onClose,
  onConfirmed,
}: Props) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

  const { selectedLine } = useRecoilValue(lineState)

  const { left: leftSafeArea, right: rightSafeArea } = useSafeAreaInsets()

  const trainTypeLines = useMemo(
    () =>
      trainType?.lines.length
        ? trainType.lines
            .slice()
            .sort((a, b) =>
              !a.trainType || !b.trainType
                ? 0
                : a.trainType?.id - b.trainType?.id
            )
        : [selectedLine],
    [selectedLine, trainType?.lines]
  )

  const stopStations = useMemo(
    () => dropEitherJunctionStation(stations).filter((s) => !getIsPass(s)),
    [stations]
  )

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          },
          isTablet
            ? {
                width: '80%',
                maxHeight: '90%',
                shadowOpacity: 0.25,
                shadowColor: '#000',
                borderRadius: 16,
              }
            : {
                width: '100%',
                height: '100%',
              },
        ]}
      >
        <Heading>
          {isJapanese
            ? `${selectedLine?.nameShort} ${trainType?.name ?? ''}`
            : `${selectedLine?.nameRoman} ${trainType?.nameRoman ?? ''}`}
        </Heading>

        <View
          style={{
            width: '100%',
          }}
        >
          <View
            style={{
              paddingLeft: leftSafeArea || SAFE_AREA_FALLBACK,
              paddingRight: rightSafeArea || SAFE_AREA_FALLBACK,
            }}
          >
            <Typography
              style={{
                fontSize: RFValue(14),
                fontWeight: 'bold',
                marginTop: 8,
              }}
            >
              {translate('allStops')}:
            </Typography>
            <Typography
              style={{
                fontSize: RFValue(11),
                marginTop: 8,
                lineHeight: RFValue(14),
              }}
            >
              {!loading && stopStations.length
                ? stopStations
                    .map((s) => (isJapanese ? s.name : s.nameRoman))
                    .join('、')
                : `${translate('loadingAPI')}...`}
            </Typography>
            <Typography
              style={{
                fontSize: RFValue(14),
                fontWeight: 'bold',
                marginTop: 16,
              }}
            >
              {translate('eachTrainTypes')}:
            </Typography>
          </View>
          <ScrollView
            horizontal
            style={{
              marginTop: 8,
              maxHeight: '35%',
            }}
            contentContainerStyle={{
              flexWrap: 'wrap',
              flexDirection: 'column',
              rowGap: 4,
              columnGap: 48,
              paddingLeft: leftSafeArea || SAFE_AREA_FALLBACK,
              paddingRight: rightSafeArea || SAFE_AREA_FALLBACK,
            }}
          >
            {trainTypeLines.map((l) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                key={l?.id}
              >
                <View
                  style={{
                    backgroundColor: l?.color ?? '#000000',
                    width: 10,
                    height: 10,
                    borderRadius: 8,
                    marginRight: 2,
                  }}
                />
                <Typography
                  style={{
                    fontSize: RFValue(11),
                    lineHeight: RFValue(14),
                    flex: 1,
                  }}
                >
                  {(isJapanese ? l?.nameShort : l?.nameRoman) ?? ''}:{' '}
                </Typography>
                <Typography
                  style={{
                    color: l?.trainType?.color ?? '#000000',
                    textAlign: 'right',
                    fontSize: RFValue(11),
                    fontWeight: 'bold',
                    lineHeight: RFValue(14),
                  }}
                >
                  {isJapanese
                    ? l?.trainType?.name ?? '普通/各駅停車'
                    : l?.trainType?.nameRoman ?? 'Local'}
                </Typography>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.buttons}>
          <Button
            color={isLEDTheme ? undefined : '#008ffe'}
            onPress={() => onConfirmed(trainType ?? undefined)}
            disabled={loading || disabled}
          >
            {translate('submit')}
          </Button>
          <Button color={isLEDTheme ? undefined : '#333'} onPress={onClose}>
            {translate('cancel')}
          </Button>
        </View>
      </View>
    </View>
  )
}
