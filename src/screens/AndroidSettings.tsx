import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  Animated as RNAnimated,
  StyleSheet,
  View,
} from 'react-native';
import Button from '~/components/Button';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import { StatePanel } from '~/components/ToggleButton';
import Typography from '~/components/Typography';
import { STORAGE_KEYS } from '~/constants';
import { storage } from '~/lib/storage';
import { pictureInPictureAtom } from '~/store/atoms/pictureInPicture';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  screenBg: {
    backgroundColor: '#FAFAFA',
  },
});

const AndroidSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const [{ enabled: pictureInPictureEnabled }, setPictureInPicture] =
    useAtom(pictureInPictureAtom);
  const navigation = useNavigation();

  const handleTogglePictureInPicture = useCallback(() => {
    const nextValue = !pictureInPictureEnabled;
    try {
      storage.set(
        STORAGE_KEYS.PICTURE_IN_PICTURE_ENABLED,
        nextValue ? 'true' : 'false'
      );
      setPictureInPicture((prev) => ({
        ...prev,
        enabled: nextValue,
      }));
    } catch (error) {
      console.error('Failed to toggle Picture in Picture setting', error);
      showDialog(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [pictureInPictureEnabled, setPictureInPicture]);

  const handleScroll = useRef(
    RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    })
  ).current;

  return (
    <>
      <View style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <RNAnimated.ScrollView
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            headerHeight
              ? { marginTop: headerHeight, paddingBottom: headerHeight }
              : null,
          ]}
        >
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={translate('pictureInPictureTitle')}
            accessibilityState={{ checked: pictureInPictureEnabled }}
            onPress={handleTogglePictureInPicture}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 24,
              paddingVertical: 16,
              backgroundColor: isLEDTheme ? '#333' : 'white',
              borderRadius: isLEDTheme ? 0 : 12,
            }}
          >
            <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
              {translate('pictureInPictureTitle')}
            </Typography>
            <StatePanel state={pictureInPictureEnabled} />
          </Pressable>
          <Typography
            style={{
              marginTop: 16,
              textAlign: 'center',
              color: '#8B8B8B',
            }}
          >
            {translate('pictureInPictureDescription')}
          </Typography>
          <Button
            style={{ width: 128, alignSelf: 'center', marginTop: 32 }}
            textStyle={{ fontWeight: 'bold' }}
            onPress={() => navigation.goBack()}
          >
            OK
          </Button>
        </RNAnimated.ScrollView>
      </View>
      <SettingsHeader
        title={translate('androidSettings')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
    </>
  );
};

export default React.memo(AndroidSettingsScreen);
