import React, { memo, useCallback, Dispatch } from 'react';
import { View, StyleSheet, Picker, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Heading from '../../components/Heading';
import settingsThemes from './themes';
import { AppTheme, ThemeActionTypes } from '../../store/types/theme';

import { TrainLCDAppState } from '../../store';
import Button from '../../components/Button';
import getTranslatedText from '../../utils/translate';
import updateAppTheme from '../../store/actions/theme';

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
  },
  settingItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginBottom: 32,
  },
});

const ThemeSettingsScreen: React.FC = () => {
  const { theme } = useSelector((state: TrainLCDAppState) => state.theme);
  const dispatch = useDispatch<Dispatch<ThemeActionTypes>>();

  const onThemeValueChange = useCallback(
    (t: AppTheme) => {
      dispatch(updateAppTheme(t));
    },
    [dispatch]
  );

  const navigation = useNavigation();

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <ScrollView contentContainerStyle={styles.rootPadding}>
      <Heading>{getTranslatedText('selectThemeTitle')}</Heading>
      <View style={styles.settingItem}>
        <Picker
          selectedValue={theme}
          style={{
            width: '50%',
          }}
          onValueChange={onThemeValueChange}
        >
          {settingsThemes.map((t) => (
            <Picker.Item key={t.value} label={t.label} value={t.value} />
          ))}
        </Picker>
      </View>
      <View style={[styles.settingItem, styles.backButton]}>
        <Button onPress={onPressBack}>{getTranslatedText('back')}</Button>
      </View>
    </ScrollView>
  );
};

export default memo(ThemeSettingsScreen);
