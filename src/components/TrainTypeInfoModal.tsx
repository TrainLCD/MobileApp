import React, { useMemo } from 'react'
import { Modal, SafeAreaView, StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilValue } from 'recoil'
import { Station, TrainType } from '../../gen/proto/stationapi_pb'
import { LED_THEME_BG_COLOR } from '../constants'
import lineState from '../store/atoms/line'
import { isLEDSelector } from '../store/selectors/isLED'
import { isJapanese } from '../translation'
import dropEitherJunctionStation from '../utils/dropJunctionStation'
import getIsPass from '../utils/isPass'
import isTablet from '../utils/isTablet'
import Button from './Button'
import Heading from './Heading'
import Typography from './Typography'

type Props = {
  visible: boolean
  trainType: TrainType
  stations: Station[]
  loading: boolean
  error: Error
  onClose: () => void
  onConfirmed: (trainType: TrainType) => void
}

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    height: '100%',
  },
  modalView: {
    paddingVertical: isTablet ? 32 : 24,
    height: isTablet ? undefined : 'auto',
    width: '100%',
  },
  buttons: {
    marginTop: isTablet ? 12 : 6,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 16,
  },
})

export const TrainTypeInfoModal: React.FC<Props> = ({
  visible,
  trainType,
  stations,
  onClose,
  onConfirmed,
}: Props) => {
  const isLEDTheme = useRecoilValue(isLEDSelector)
  const { selectedLine } = useRecoilValue(lineState)

  const trainTypeLines = useMemo(
    () =>
      trainType.lines
        .slice()
        .sort((a, b) =>
          !a.trainType || !b.trainType ? 0 : a.trainType?.id - b.trainType?.id
        ),
    [trainType.lines]
  )

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['landscape']}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View
          style={[
            styles.modalView,
            {
              backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
            },
            isTablet
              ? {
                  width: '80%',
                  shadowOpacity: 0.25,
                  shadowColor: '#000',
                  borderRadius: 16,
                }
              : { borderRadius: 8 },
          ]}
        >
          <Heading>
            {isJapanese
              ? `${selectedLine?.nameShort} ${trainType.name}`
              : `${selectedLine?.nameRoman} ${trainType.nameRoman}`}
          </Heading>

          <View style={{ padding: isTablet ? 32 : 24 }}>
            <Typography
              style={{
                fontSize: RFValue(14),
                fontWeight: 'bold',
                marginTop: isTablet ? 16 : 8,
              }}
            >
              停車駅:
            </Typography>
            <Typography
              style={{
                fontSize: RFValue(11),
                marginTop: isTablet ? 8 : 4,
              }}
            >
              {dropEitherJunctionStation(stations)
                .filter((s) => !getIsPass(s))
                .map((sta) => sta.name)
                .join('、')}
            </Typography>
            <Typography
              style={{
                fontSize: RFValue(14),
                fontWeight: 'bold',
                marginTop: isTablet ? 16 : 8,
              }}
            >
              各線の種別:
            </Typography>
            <View
              style={{
                marginTop: isTablet ? 8 : 4,
              }}
            >
              {trainTypeLines.map((l) => (
                <View style={{ flexDirection: 'row' }} key={l.id}>
                  <Typography style={{ width: '30%', fontSize: RFValue(11) }}>
                    {l.nameShort}:
                  </Typography>
                  <Typography
                    style={{
                      color: l.trainType?.color,
                      textAlign: 'right',
                      fontSize: RFValue(11),
                      fontWeight: 'bold',
                    }}
                  >
                    {l.trainType?.name}
                  </Typography>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.buttons}>
            <Button
              color={isLEDTheme ? undefined : '#008ffe'}
              onPress={() => onConfirmed(trainType)}
            >
              確定
            </Button>
            <Button color={isLEDTheme ? undefined : '#333'} onPress={onClose}>
              キャンセル
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}
