import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRecoilValue } from 'recoil';
import type { TrainType } from '../../gen/proto/stationapi_pb';
import { japaneseRegexp, parenthesisRegexp } from '../constants';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import { getIsLocal, getIsRapid } from '../utils/trainTypeString';
import truncateTrainType from '../utils/truncateTrainType';
import Typography from './Typography';
import { useCurrentLine } from '../hooks/useCurrentLine';
import Svg, { Text } from 'react-native-svg';

type Props = {
  trainType: TrainType | null;
};

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: isTablet ? 24 : 12,
    borderRadius: 4,
    width: '100%',
    height: isTablet ? 55 : 35,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: 'white',
    flexDirection: 'row',
    zIndex: 9999,
  },
  // text: {
  //   color: '#fff',
  //   textAlign: 'center',
  //   fontWeight: 'bold',
  //   transform: [{ skewX: '-5deg' }],
  //   fontSize: isTablet ? 48 : 24,
  // },
});

const TrainTypeBoxJL: React.FC<Props> = ({ trainType }: Props) => {
  const { headerState } = useRecoilValue(navigationState);

  const line = useCurrentLine();

  const headerLangState = useMemo((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState;
  }, [headerState]);

  const localTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return translate('localEn');
      case 'ZH':
        return translate('localZh');
      case 'KO':
        return translate('localKo');
      default:
        return translate('local2');
    }
  }, [headerLangState]);

  const trainTypeNameJa = (trainType?.name || localTypeText)?.replace(
    parenthesisRegexp,
    ''
  );
  const trainTypeNameR = truncateTrainType(
    trainType?.nameRoman || translate('localEn')
  );
  const trainTypeNameZh = truncateTrainType(
    trainType?.nameChinese || translate('localZh')
  );
  const trainTypeNameKo = truncateTrainType(
    trainType?.nameKorean || translate('localKo')
  );

  const trainTypeName = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return trainTypeNameR;
      case 'ZH':
        return trainTypeNameZh;
      case 'KO':
        return trainTypeNameKo;
      default:
        return trainTypeNameJa;
    }
  }, [
    headerLangState,
    trainTypeNameJa,
    trainTypeNameKo,
    trainTypeNameR,
    trainTypeNameZh,
  ]);

  const trainTypeColor = useMemo(() => {
    if (getIsLocal(trainType)) {
      return line?.color ?? '#222';
    }

    return trainType?.color ?? '#222';
  }, [trainType, line]);

  return (
    <View style={styles.box}>
      <Svg
        style={{ flex: 1, width: '100%', backgroundColor: 'red' }}
        width={isTablet ? 100 : 50}
        height={isTablet ? 50 : 30}
      >
        {headerLangState !== 'EN' && japaneseRegexp.test(trainTypeName) ? (
          trainTypeName.split('').map((char, idx) => (
            <Text
              // style={{
              //   ...styles.text,
              //   color: trainTypeColor,
              //   fontFamily: undefined,
              //   fontWeight: '800',
              // }}
              color={trainTypeColor}
              fontWeight={800}
              transform={[{ skewX: '-5deg' }]}
              fontSize={isTablet ? 48 : 24}
              x={isTablet ? 50 : 5}
              y={isTablet ? 50 : 5}
              key={`${char}${idx.toString()}`}
            >
              {char}
            </Text>
          ))
        ) : (
          <Text
            // style={{
            //   ...styles.text,
            //   color: trainTypeColor,
            // }}
            color={trainTypeColor}
            transform={[{ skewX: '-5deg' }]}
            fontSize={isTablet ? 48 : 24}
            x={isTablet ? 50 : 5}
            y={isTablet ? 50 : 5}
          >
            {trainTypeName}
          </Text>
        )}
      </Svg>
    </View>
  );
};

export default React.memo(TrainTypeBoxJL);
