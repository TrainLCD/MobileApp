import React, { useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableWithoutFeedback,
  VirtualizedList,
  Alert,
  ListRenderItemInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Path, Svg } from 'react-native-svg';
import { useRecoilState } from 'recoil';
import { RFValue } from 'react-native-responsive-fontsize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Heading from '../../components/Heading';
import FAB from '../../components/FAB';
import { isJapanese, translate } from '../../translation';
import {
  ALL_AVAILABLE_LANGUAGES,
  AvailableLanguage,
} from '../../constants/languages';
import navigationState from '../../store/atoms/navigation';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    height: '100%',
  },
  main: {
    marginTop: 24,
  },
  settingItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginBottom: 32,
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
  checkboxActive: {
    backgroundColor: '#555',
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
  const localizedAvailableLanguage = (() => {
    switch (item) {
      case 'JA':
        return isJapanese ? '日本語' : 'Japanese';
      case 'EN':
        return isJapanese ? '英語' : 'English';
      case 'ZH':
        return isJapanese ? '中国語' : 'Chinese';
      case 'KO':
        return isJapanese ? '韓国語' : 'Korean';
      default:
        return '';
    }
  })();

  return (
    <View style={styles.itemRoot}>
      <TouchableWithoutFeedback onPress={item === 'JA' ? null : onPress}>
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

  const handleBetaApproved = useCallback(() => {
    AsyncStorage.setItem('@TrainLCD:languagesBetaApproved', 'true');
  }, []);

  const showBetaAlert = useCallback(() => {
    Alert.alert(translate('notice'), translate('betaAlertText'), [
      {
        text: 'OK',
        onPress: handleBetaApproved,
      },
    ]);
  }, [handleBetaApproved]);

  useEffect(() => {
    const showBetaAlertAsync = async () => {
      const approved = await AsyncStorage.getItem(
        '@TrainLCD:languagesBetaApproved'
      );
      if (!approved) {
        showBetaAlert();
      }
    };
    showBetaAlertAsync();
  }, [showBetaAlert]);

  const onPressBack = useCallback(async () => {
    await AsyncStorage.setItem(
      '@TrainLCD:enabledLanguages',
      `["${enabledLanguages.join(`","`)}"]`
    );

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [enabledLanguages, navigation]);

  const renderItem: React.FC<
    ListRenderItemInfo<AvailableLanguage>
  > = useCallback(
    ({ item }) => {
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
            enabledLanguages: [...prev.enabledLanguages, item],
          }));
        }
      };
      return (
        <ListItem active={isActive} onPress={handleListItemPress} item={item} />
      );
    },
    [enabledLanguages, setNavigation]
  );

  const getItemCount = () => ALL_AVAILABLE_LANGUAGES.length;
  const getItem = (data: AvailableLanguage, index: number) => data[index];

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
