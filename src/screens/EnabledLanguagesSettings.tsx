import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAtom } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  VirtualizedList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';
import FAB from '../components/FAB';
import { Heading } from '../components/Heading';
import Typography from '../components/Typography';
import {
  ALL_AVAILABLE_LANGUAGES,
  ALL_AVAILABLE_LANGUAGES_WITH_PRIORITY,
  ASYNC_STORAGE_KEYS,
  type AvailableLanguage,
} from '../constants';
import { useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import { isJapanese, translate } from '../translation';
import { RFValue } from '../utils/rfValue';

const styles = StyleSheet.create({
  root: {
    padding: 24,
    height: '100%',
  },
  itemRoot: {
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageName: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 2,
    borderColor: '#555',
    marginRight: 12,
  },
  listContainerStyle: {
    paddingBottom: 24,
  },
  headingStyle: {
    marginVertical: 24,
  },
});

type ListItemProps = {
  item: AvailableLanguage;
  active: boolean;
  onPress: () => void;
};

const ListItem: React.FC<ListItemProps> = ({
  active,
  item,
  onPress,
}: ListItemProps) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const localizedAvailableLanguage = useMemo(() => {
    switch (item) {
      case 'JA':
        return isJapanese ? '日本語' : 'Japanese';
      case 'EN':
        return isJapanese ? '英語' : 'English';
      case 'ZH':
        return isJapanese ? '中国語(簡体字)' : 'Chinese(Simplified)';
      case 'KO':
        return isJapanese ? '韓国語' : 'Korean';
      default:
        return '';
    }
  }, [item]);

  const noop = () => undefined;

  const getCheckboxBorderColor = useCallback(
    (lang: AvailableLanguage) => {
      if (lang === 'JA') {
        return isLEDTheme ? '#aaa' : '#ccc';
      }

      return isLEDTheme ? '#fff' : '#333';
    },
    [isLEDTheme]
  );
  const checkmarkFill = useMemo(() => {
    if (isLEDTheme) {
      return item === 'JA' ? '#aaa' : '#fff';
    }

    return item === 'JA' ? '#ccc' : '#333';
  }, [isLEDTheme, item]);

  return (
    <View style={styles.itemRoot}>
      <TouchableWithoutFeedback onPress={item === 'JA' ? noop : onPress}>
        <View style={styles.item}>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: getCheckboxBorderColor(item),
                backgroundColor: isLEDTheme ? '#212121' : 'white',
              },
            ]}
          >
            {active && (
              <Svg height="100%" width="100%" viewBox="0 0 24 24">
                <Path
                  fill={checkmarkFill}
                  d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"
                />
              </Svg>
            )}
          </View>
          <Typography
            style={[
              styles.languageName,
              {
                color: getCheckboxBorderColor(item),
              },
            ]}
          >
            {localizedAvailableLanguage}
          </Typography>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const EnabledLanguagesSettings: React.FC = () => {
  const [{ enabledLanguages }, setNavigation] = useAtom(navigationState);
  const navigation = useNavigation();

  const onPressBack = useCallback(async () => {
    await AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.ENABLED_LANGUAGES,
      `["${enabledLanguages.join(`","`)}"]`
    );

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [enabledLanguages, navigation]);

  const languageSorter = useCallback(
    (a: AvailableLanguage, b: AvailableLanguage): number => {
      const aWithPriority = ALL_AVAILABLE_LANGUAGES_WITH_PRIORITY.find(
        (l) => l.code === a
      );
      const bWithPriority = ALL_AVAILABLE_LANGUAGES_WITH_PRIORITY.find(
        (l) => l.code === b
      );
      if (!aWithPriority || !bWithPriority) {
        return 0;
      }
      if (aWithPriority.priority < bWithPriority.priority) {
        return -1;
      }
      if (aWithPriority.priority > bWithPriority.priority) {
        return 1;
      }

      return 0;
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: AvailableLanguage }) => {
      const isActive = !!enabledLanguages.find((id) => id === item);
      const handleListItemPress = (): void => {
        if (isActive) {
          setNavigation((prev) => ({
            ...prev,
            enabledLanguages: prev.enabledLanguages.filter((id) => id !== item),
          }));
        } else {
          setNavigation((prev) => ({
            ...prev,
            enabledLanguages: [...prev.enabledLanguages, item].sort(
              languageSorter
            ),
          }));
        }
      };
      return (
        <ListItem active={isActive} onPress={handleListItemPress} item={item} />
      );
    },
    [enabledLanguages, setNavigation, languageSorter]
  );

  const getItemCount = () => ALL_AVAILABLE_LANGUAGES.length;
  const getItem = (
    data: AvailableLanguage[],
    index: number
  ): AvailableLanguage => data[index];

  const listHeaderComponent = () => (
    <Heading style={styles.headingStyle}>
      {translate('selectLanguagesTitle')}
    </Heading>
  );

  return (
    <>
      <SafeAreaView style={styles.root}>
        <VirtualizedList
          ListHeaderComponent={listHeaderComponent}
          contentContainerStyle={styles.listContainerStyle}
          getItemCount={getItemCount}
          getItem={getItem}
          data={ALL_AVAILABLE_LANGUAGES}
          renderItem={renderItem}
          keyExtractor={(item: AvailableLanguage): AvailableLanguage => item}
        />
      </SafeAreaView>
      <FAB onPress={onPressBack} icon="checkmark" />
    </>
  );
};

export default React.memo(EnabledLanguagesSettings);
