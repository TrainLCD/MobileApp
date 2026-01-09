import { StackActions, useNavigation } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Typography from '../components/Typography';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type WalkthroughStep = {
  key: string;
  titleKey: string;
  descriptionKey: string;
};

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    key: '1',
    titleKey: 'walkthroughTitle1',
    descriptionKey: 'walkthroughDescription1',
  },
  {
    key: '2',
    titleKey: 'walkthroughTitle2',
    descriptionKey: 'walkthroughDescription2',
  },
  {
    key: '3',
    titleKey: 'walkthroughTitle3',
    descriptionKey: 'walkthroughDescription3',
  },
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fcfcfc',
  },
  container: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: RFValue(24),
    fontWeight: 'bold',
    color: '#03a9f4',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: Platform.select({
      ios: RFValue(32),
    }),
  },
  description: {
    fontSize: RFValue(14),
    color: '#333',
    textAlign: 'center',
    lineHeight: Platform.select({
      ios: RFValue(22),
      android: RFValue(24),
    }),
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ddd',
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: '#03a9f4',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSpacer: {
    width: 16,
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  skipText: {
    fontSize: RFValue(14),
    color: '#666',
  },
});

type Props = {
  onComplete: () => void;
};

const WalkthroughScreen: React.FC<Props> = ({ onComplete }) => {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleComplete = useCallback(() => {
    onComplete();
    navigation.dispatch(StackActions.replace('Privacy'));
  }, [navigation, onComplete]);

  const handleNext = useCallback(() => {
    if (currentIndex < WALKTHROUGH_STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleComplete();
    }
  }, [currentIndex, handleComplete]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item }: { item: WalkthroughStep }) => (
      <View style={styles.slide}>
        <Typography style={styles.title}>{translate(item.titleKey)}</Typography>
        <Typography style={styles.description}>
          {translate(item.descriptionKey)}
        </Typography>
      </View>
    ),
    []
  );

  const isLastStep = currentIndex === WALKTHROUGH_STEPS.length - 1;

  return (
    <SafeAreaView style={styles.root}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Typography style={styles.skipText}>
          {translate('walkthroughSkip')}
        </Typography>
      </TouchableOpacity>

      <View style={styles.container}>
        <View style={styles.slideContainer}>
          <FlatList
            ref={flatListRef}
            data={WALKTHROUGH_STEPS}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.key}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {WALKTHROUGH_STEPS.map((_, index) => (
              <View
                key={`dot-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable array
                  index
                }`}
                style={[styles.dot, index === currentIndex && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.buttons}>
            <Button onPress={handleNext}>
              {isLastStep
                ? translate('walkthroughStart')
                : translate('walkthroughNext')}
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default React.memo(WalkthroughScreen);
