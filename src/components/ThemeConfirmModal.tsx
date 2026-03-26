import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import { lighten } from 'polished';
import type React from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { THEME_PREFERENCE, type ThemePreference } from '~/models/Theme';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import { getThemeInfo } from '~/utils/themeInfo';
import { IN_USE_COLOR_MAP, LED_THEME_BG_COLOR } from '../constants';
import Button from './Button';
import { CustomModal } from './CustomModal';
import Typography from './Typography';

const styles = StyleSheet.create({
  contentView: {
    width: '100%',
  },
  container: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    overflow: 'hidden',
    marginRight: 12,
  },
  title: {
    fontSize: RFValue(16),
    fontWeight: 'bold',
    flex: 1,
  },
  description: {
    fontSize: RFValue(12),
    lineHeight: RFValue(16),
    marginBottom: 16,
  },
  previewContainer: {
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
  },
  previewImageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#fff',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  button: {
    minWidth: 100,
  },
  buttonText: {
    fontWeight: 'bold',
  },
  autoPreviewEmoji: {
    fontSize: RFValue(64),
    textAlign: 'center',
  },
});

type Props = {
  visible: boolean;
  themeId: ThemePreference | null;
  themeTitle: string;
  onClose: () => void;
  onConfirm: () => void;
  onCloseAnimationEnd?: () => void;
};

export const ThemeConfirmModal: React.FC<Props> = ({
  visible,
  themeId,
  themeTitle,
  onClose,
  onConfirm,
  onCloseAnimationEnd,
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const isAuto = themeId === THEME_PREFERENCE.AUTO;
  const themeInfo = useMemo(
    () => (themeId && !isAuto ? getThemeInfo(themeId) : null),
    [themeId, isAuto]
  );
  const previewImage = useMemo(
    () => (isTablet ? themeInfo?.tabletImage : themeInfo?.spImage),
    [themeInfo]
  );
  const themeColor = themeId && !isAuto ? IN_USE_COLOR_MAP[themeId] : null;
  const borderRadius = isLEDTheme ? 0 : 8;

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      onCloseAnimationEnd={onCloseAnimationEnd}
      contentContainerStyle={[
        styles.contentView,
        {
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={[styles.colorSwatch, { borderRadius }]}>
            <LinearGradient
              colors={
                themeColor
                  ? [themeColor, lighten(0.1, themeColor)]
                  : ['#5B9BD5', '#A78BCA']
              }
              style={{ flex: 1 }}
            />
          </View>
          <Typography style={styles.title}>{themeTitle}</Typography>
        </View>
        <Typography style={styles.description}>
          {isAuto
            ? translate('themeDescriptionAuto')
            : (themeInfo?.description ?? '')}
        </Typography>
        <View
          style={[
            styles.previewContainer,
            { borderRadius: isLEDTheme ? 0 : 16 },
          ]}
        >
          <View
            style={[
              styles.previewImageWrap,
              {
                backgroundColor: isLEDTheme ? '#444' : '#e0e0e0',
                borderRadius: isLEDTheme ? 0 : 16,
              },
            ]}
          >
            {isAuto ? (
              <Typography style={styles.autoPreviewEmoji}>❓</Typography>
            ) : (
              <Image
                source={previewImage}
                style={styles.previewImage}
                contentFit="contain"
              />
            )}
          </View>
        </View>
        <View style={styles.buttonsRow}>
          <Button
            style={styles.button}
            textStyle={styles.buttonText}
            onPress={onClose}
            outline
          >
            {translate('cancel')}
          </Button>
          <Button
            style={styles.button}
            textStyle={styles.buttonText}
            onPress={onConfirm}
          >
            {translate('themeConfirmApply')}
          </Button>
        </View>
      </ScrollView>
    </CustomModal>
  );
};
