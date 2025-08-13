import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TrainType } from '~/gen/proto/stationapi_pb';
import { japaneseRegexp, parenthesisRegexp } from '../constants';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import { getIsLocal, getIsRapid } from '../utils/trainTypeString';
import truncateTrainType from '../utils/truncateTrainType';
import Typography from './Typography';

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
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    transform: [{ skewX: '-5deg' }],
    fontSize: isTablet ? 36 : 24,
    flex: 1,
  },
});

const TrainTypeBoxJO: React.FC<Props> = ({ trainType }: Props) => {
  const { headerState } = useAtomValue(navigationState);

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
        return trainTypeNameR?.split('\n')[0]?.trim();
      case 'ZH':
        return trainTypeNameZh?.split('\n')[0]?.trim();
      case 'KO':
        return trainTypeNameKo?.split('\n')[0]?.trim();
      default:
        return trainTypeNameJa?.split('\n')[0]?.trim();
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
      return '#222';
    }
    if (getIsRapid(trainType)) {
      return '#0067C0';
    }
    return trainType?.color ?? '#222';
  }, [trainType]);

  const numberOfLines = useMemo(
    // trainTypeNameがundefined/nullの場合のクラッシュを防ぐためのオプショナルチェーニング
    () => (trainTypeName?.split('\n').length === 1 ? 1 : 2),
    [trainTypeName]
  );

  return (
    <View style={styles.box}>
      {headerLangState !== 'EN' && japaneseRegexp.test(trainTypeName) ? (
        trainTypeName.split('').map((char, idx) => (
          <Typography
            numberOfLines={numberOfLines}
            adjustsFontSizeToFit
            style={{
              ...styles.text,
              color: trainTypeColor,
              fontFamily: undefined,
              fontWeight: '800',
            }}
            key={`${char}${idx.toString()}`}
          >
            {char}
          </Typography>
        ))
      ) : (
        <Typography
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            ...styles.text,
            color: trainTypeColor,
          }}
        >
          {trainTypeName}
        </Typography>
      )}
    </View>
  );
};

export default React.memo(TrainTypeBoxJO);
