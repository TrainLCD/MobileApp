import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parenthesisRegexp } from '../constants/regexp';
import { getLineMark } from '../lineMark';
import { Line } from '../models/StationAPI';
import AppTheme from '../models/Theme';
import { isJapanese, translate } from '../translation';
import isTablet from '../utils/isTablet';
import Heading from './Heading';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';

interface Props {
  onPress: () => void;
  lines: Line[];
  theme: AppTheme;
}

const styles = StyleSheet.create({
  transferLine: {
    flexBasis: '50%',
    marginBottom: isTablet ? 16 : 8,
  },
  transferList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isTablet ? 32 : 24,
  },
  transferLineInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineNameContainer: {
    width: '85%',
  },
  lineName: {
    fontSize: RFValue(18),
    color: '#333',
    fontWeight: 'bold',
  },
  lineNameEn: {
    fontSize: RFValue(12),
    color: '#333',
    fontWeight: 'bold',
  },
  headingContainerMetro: {
    height: RFValue(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headingContainerSaikyo: {
    marginTop: 24,
    width: '75%',
    alignSelf: 'center',
  },
});

const Transfers: React.FC<Props> = ({ onPress, lines, theme }: Props) => {
  const { left: safeAreaLeft } = useSafeAreaInsets();

  const renderTransferLines = (): JSX.Element[] =>
    lines.map((line) => {
      const lineMark = getLineMark(line);
      return (
        <View style={styles.transferLine} key={line.id}>
          <View style={styles.transferLineInner}>
            {lineMark ? (
              <TransferLineMark line={line} mark={lineMark} />
            ) : (
              <TransferLineDot line={line} />
            )}
            {isJapanese ? (
              <View style={styles.lineNameContainer}>
                <Text style={styles.lineName}>
                  {line.name.replace(parenthesisRegexp, '')}
                </Text>
                <Text style={styles.lineNameEn}>
                  {line.nameR.replace(parenthesisRegexp, '')}
                </Text>
              </View>
            ) : (
              <Text style={styles.lineName}>
                {line.nameR.replace(parenthesisRegexp, '')}
              </Text>
            )}
          </View>
        </View>
      );
    });

  const CustomHeading = () => {
    switch (theme) {
      case AppTheme.TokyoMetro:
      case AppTheme.TY:
        return (
          <LinearGradient
            colors={['#fcfcfc', '#f5f5f5', '#ddd']}
            locations={[0, 0.95, 1]}
            style={styles.headingContainerMetro}
          >
            <Heading>{translate('transfer')}</Heading>
          </LinearGradient>
        );
      case AppTheme.Saikyo:
        return (
          <LinearGradient
            colors={['white', '#ccc', '#ccc', 'white']}
            start={[0, 1]}
            end={[1, 0]}
            locations={[0, 0.1, 0.9, 1]}
            style={styles.headingContainerSaikyo}
          >
            <Heading style={{ color: '#212121', fontWeight: '600' }}>
              {translate('transfer')}
            </Heading>
          </LinearGradient>
        );
      default:
        return (
          <Heading style={{ marginTop: 24 }}>{translate('transfer')}</Heading>
        );
    }
  };

  return (
    <ScrollView>
      <TouchableWithoutFeedback
        onPress={onPress}
        containerStyle={{
          flex: 1,
          paddingLeft: safeAreaLeft,
        }}
      >
        <CustomHeading />
        <View style={styles.transferList}>{renderTransferLines()}</View>
      </TouchableWithoutFeedback>
    </ScrollView>
  );
};

export default Transfers;
