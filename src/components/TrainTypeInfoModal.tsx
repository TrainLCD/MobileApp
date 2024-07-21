import React, { useMemo } from 'react'
import { Modal, SafeAreaView, StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilValue } from 'recoil'
import { Station, TrainType } from '../../gen/proto/stationapi_pb'
import { LED_THEME_BG_COLOR } from '../constants'
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
  onConfirmed: () => void
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
    paddingVertical: 32,
    height: !isTablet ? '100%' : undefined,
    width: '100%',
  },
  buttons: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'center',
  },
  button: { marginHorizontal: 8 },
})

export const TrainTypeInfoModal: React.FC<Props> = ({
  visible,
  trainType,
  stations,
  onClose,
  onConfirmed,
}: Props) => {
  const isLEDTheme = useRecoilValue(isLEDSelector)

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
                  shadowRadius: 1,
                  borderRadius: 16,
                }
              : undefined,
          ]}
        >
          <Heading>
            {isJapanese
              ? `${trainType.line?.nameShort} ${trainType.name}`
              : `${trainType.line?.nameRoman} ${trainType.nameRoman}`}
          </Heading>

          <View style={{ padding: 32 }}>
            <Typography
              style={{
                fontSize: RFValue(14),
                fontWeight: 'bold',
                marginTop: 16,
              }}
            >
              停車駅:
            </Typography>
            <Typography
              style={{
                fontSize: RFValue(11),
                marginTop: 8,
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
                marginTop: 16,
              }}
            >
              各線の種別:
            </Typography>
            <View
              style={{
                marginTop: 8,
              }}
            >
              {trainTypeLines.map((l) => (
                <View style={{ flexDirection: 'row' }} key={l.id}>
                  <Typography style={{ width: '30%', fontSize: RFValue(11) }}>
                    {l.nameShort}:
                  </Typography>
                  <Typography
                    style={{
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
              style={styles.button}
              onPress={onConfirmed}
            >
              確定
            </Button>
            <Button
              color={isLEDTheme ? undefined : '#333'}
              style={styles.button}
              onPress={onClose}
            >
              キャンセル
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}
