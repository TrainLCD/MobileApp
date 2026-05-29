import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import { lighten } from 'polished';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Typography from '~/components/Typography';
import { pictureInPictureAtom } from '~/store/atoms/pictureInPicture';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    overflow: 'hidden',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
  },
  cardShade: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  lineLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.75,
    marginBottom: 6,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  stationName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 19,
    textAlign: 'center',
  },
  stationNumber: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.78,
    textAlign: 'center',
  },
  arrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
});

const formatStationNumber = (stationNumber: string): string =>
  stationNumber ? stationNumber : ' ';

const getLightenedLineColor = (lineColor: string): string => {
  try {
    return lighten(0.12, lineColor);
  } catch (_error) {
    return '#C34FA5';
  }
};

const AndroidPictureInPictureView: React.FC = () => {
  const { active, activityState } = useAtomValue(pictureInPictureAtom);

  if (Platform.OS !== 'android' || !active || !activityState) {
    return null;
  }

  const currentName =
    activityState.passingStationName || activityState.stationName;
  const currentNumber =
    activityState.passingStationNumber || activityState.stationNumber;
  const nextName = activityState.nextStationName;
  const cardBackgroundColor = activityState.lineColor || '#A20F72';
  const gradientColor = getLightenedLineColor(cardBackgroundColor);

  return (
    <View style={[styles.root, { backgroundColor: cardBackgroundColor }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: cardBackgroundColor,
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', gradientColor]}
          pointerEvents="none"
          style={styles.bottomGradient}
        />
        <View style={styles.cardShade}>
          <Typography style={styles.lineLabel} numberOfLines={1}>
            {[activityState.lineName, activityState.trainTypeName]
              .filter(Boolean)
              .join(' ')}
          </Typography>

          <View style={styles.stationRow}>
            <View style={styles.stationBlock}>
              <Typography
                ellipsizeMode="tail"
                numberOfLines={2}
                style={styles.stationName}
              >
                {currentName}
              </Typography>
              <Typography style={styles.stationNumber} numberOfLines={1}>
                {formatStationNumber(currentNumber)}
              </Typography>
            </View>
            {nextName ? <Typography style={styles.arrow}>→</Typography> : null}
            {nextName ? (
              <View style={styles.stationBlock}>
                <Typography
                  ellipsizeMode="tail"
                  numberOfLines={2}
                  style={styles.stationName}
                >
                  {nextName}
                </Typography>
                <Typography style={styles.stationNumber} numberOfLines={1}>
                  {formatStationNumber(activityState.nextStationNumber)}
                </Typography>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
};

export default React.memo(AndroidPictureInPictureView);
