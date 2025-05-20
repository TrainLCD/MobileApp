import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRecoilValue } from 'recoil';
import { japaneseRegexp, parenthesisRegexp } from '~/constants';
import type { TrainType } from '~/gen/proto/stationapi_pb';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import navigationState from '~/store/atoms/navigation';
import { translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import truncateTrainType from '~/utils/truncateTrainType';
import Typography from './Typography';

type Props = {
  trainType: TrainType | null;
  trainTypeColor?: string;
};

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: isTablet ? 24 : 12,
    borderRadius: 4,
    width: '100%',
    height: isTablet ? 55 : 35,
    backgroundColor: 'white',
    zIndex: 9999,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 1,
    shadowOffset: { height: 1, width: 0 },
  },
  innerBox: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    transform: [{ skewX: '-5deg' }],
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: isTablet ? 36 : 24,
    lineHeight: isTablet ? 55 : 35,
  },
});

const TrainTypeBoxJL: React.FC<Props> = ({
  trainType,
  trainTypeColor = '#000',
}: Props) => {
  const { headerState } = useRecoilValue(navigationState);

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

  return (
    <View style={styles.box}>
      <View style={styles.innerBox}>
        {headerLangState !== 'EN' && japaneseRegexp.test(trainTypeName) ? (
          trainTypeName.split('').map((char, idx) => (
            <Typography
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
            style={{
              ...styles.text,
              color: trainTypeColor,
            }}
          >
            {trainTypeName}
          </Typography>
        )}
      </View>
    </View>
  );
};

export default React.memo(TrainTypeBoxJL);
