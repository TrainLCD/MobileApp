import { StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { translate } from '~/translation';
import Typography from './Typography';

type Props = {
  loading: boolean;
  hasSearched: boolean;
};

const styles = StyleSheet.create({
  bold: { fontWeight: 'bold' },
});

export const EmptyResult = ({ loading, hasSearched }: Props) => {
  if (loading) {
    return (
      <SkeletonPlaceholder borderRadius={4} speed={1500}>
        <SkeletonPlaceholder.Item width="100%" height={72} />
      </SkeletonPlaceholder>
    );
  }

  if (hasSearched) {
    return (
      <Typography style={styles.bold}>
        {translate('emptySearchResult')}
      </Typography>
    );
  }

  return null;
};
