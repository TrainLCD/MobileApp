import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import {
  ListRenderItemInfo,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  VirtualizedList,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { Path, Svg } from 'react-native-svg';
import { useRecoilState } from 'recoil';
import FAB from '../components/FAB';
import Heading from '../components/Heading';
import { ASYNC_STORAGE_KEYS } from '../constants/asyncStorageKeys';
import {
  ALL_AVAILABLE_LANGUAGES,
  ALL_AVAILABLE_LANGUAGES_WITH_PRIORITY,
  AvailableLanguage,
} from '../constants/languages';
import navigationState from '../store/atoms/navigation';
import { isJapanese, translate } from '../translation';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    height: '100%',
  },
  itemRoot: {
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationName: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  checkbox: {
    width: 24,
    height: 24,
    backgroundColor: 'white',
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

  return (
    <View style={styles.itemRoot}>
      <TouchableWithoutFeedback onPress={item === 'JA' ? noop : onPress}>
        <View style={styles.item}>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: item === 'JA' ? '#ccc' : '#333',
              },
            ]}
          >
            {active && (
              <Svg height="100%" width="100%" viewBox="0 0 24 24">
                <Path
                  fill={item === 'JA' ? '#ccc' : '#333'}
                  d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"
                />
              </Svg>
            )}
          </View>
          <Text style={styles.stationName}>{localizedAvailableLanguage}</Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const EnabledLanguagesSettings: React.FC = () => {
  const [{ enabledLanguages }, setNavigation] = useRecoilState(navigationState);
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

  const languageSorter = (
    a: AvailableLanguage,
    b: AvailableLanguage
  ): number => {
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
  };

  const renderItem: React.FC<ListRenderItemInfo<AvailableLanguage>> =
    useCallback(
      ({ item }) => {
        const isActive = !!enabledLanguages.find((id) => id === item);
        const handleListItemPress = (): void => {
          if (isActive) {
            setNavigation((prev) => ({
              ...prev,
              enabledLanguages: prev.enabledLanguages.filter(
                (id) => id !== item
              ),
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
          <ListItem
            active={isActive}
            onPress={handleListItemPress}
            item={item}
          />
        );
      },
      [enabledLanguages, setNavigation]
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
    <View style={styles.root}>
      <VirtualizedList
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={styles.listContainerStyle}
        getItemCount={getItemCount}
        getItem={getItem}
        data={ALL_AVAILABLE_LANGUAGES}
        renderItem={renderItem}
        keyExtractor={(item: AvailableLanguage): AvailableLanguage => item}
      />
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </View>
  );
};

export default EnabledLanguagesSettings;
