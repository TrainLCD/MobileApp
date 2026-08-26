import { StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useAppColors } from '~/providers/AppColorsProvider';
import { translate } from '~/translation';
import Typography from './Typography';

type Props = {
  loading: boolean;
  hasSearched: boolean;
};

const styles = StyleSheet.create({
  bold: { fontWeight: 'bold', fontSize: 16 },
});

export const EmptyResult = ({ loading, hasSearched }: Props) => {
  const colors = useAppColors();

  if (loading) {
    return (
      <SkeletonPlaceholder
        borderRadius={4}
        speed={1500}
        backgroundColor={colors.skeletonBackground}
        highlightColor={colors.skeletonHighlight}
      >
        <SkeletonPlaceholder.Item width="100%" height={72} />
        <SkeletonPlaceholder.Item width="100%" height={72} marginTop={8} />
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
