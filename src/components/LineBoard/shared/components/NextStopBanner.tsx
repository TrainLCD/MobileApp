import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import type { Station } from '~/@types/graphql';
import { Heading } from '~/components/Heading';
import { useAfterNextStation } from '~/hooks/useAfterNextStation';
import { useDisplayNextStation } from '~/hooks/useDisplayNextStation';
import getIsPass from '~/utils/isPass';

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 0,
    left: '12.5%',
    right: '12.5%',
  },
  text: {
    color: '#212121',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export const NextStopBanner = ({ stations }: { stations: Station[] }) => {
  // 次々駅の算出と同じ次駅を使い、ヘッダーと案内を揃える。
  const nextStation = useDisplayNextStation();
  const afterNextStation = useAfterNextStation();

  if (
    !nextStation?.name ||
    !afterNextStation?.name ||
    !stations.some((station) => getIsPass(station))
  ) {
    return null;
  }

  return (
    <LinearGradient
      colors={['white', '#ccc', '#ccc', 'white']}
      start={[0, 1]}
      end={[1, 0]}
      locations={[0, 0.1, 0.9, 1]}
      style={styles.banner}
    >
      <Heading style={styles.text}>
        {`${nextStation.name}のつぎは${afterNextStation.name}にとまります`}
      </Heading>
    </LinearGradient>
  );
};
