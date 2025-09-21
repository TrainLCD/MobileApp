import { StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { translate } from '~/translation';
import Typography from './Typography';

type Props = {
  statuses: ('error' | 'idle' | 'pending' | 'success')[];
};

const styles = StyleSheet.create({
  bold: { fontWeight: 'bold' },
});

export const EmptyResult = ({ statuses }: Props) => {
  if (statuses.every((s) => s === 'success')) {
    return (
      <Typography style={styles.bold}>
        {translate('emptySearchResult')}
      </Typography>
    );
  }

  if (statuses.includes('pending')) {
    return (
      <SkeletonPlaceholder borderRadius={4} speed={1500}>
        <SkeletonPlaceholder.Item width="100%" height={72} />
      </SkeletonPlaceholder>
    );
  }

  return null;
};
