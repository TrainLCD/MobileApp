import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import { lighten } from 'polished';
import type React from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { THEME_PREFERENCE, type ThemePreference } from '~/models/Theme';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import { getThemeInfo } from '~/utils/themeInfo';
import { AUTO_THEME_GRADIENT_COLORS, IN_USE_COLOR_MAP } from '../constants';
import { DialogModalLayout } from './DialogModalLayout';
import Typography from './Typography';

const styles = StyleSheet.create({
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
    <DialogModalLayout
      visible={visible}
      isLEDTheme={isLEDTheme}
      onClose={onClose}
      onConfirm={onConfirm}
      onCloseAnimationEnd={onCloseAnimationEnd}
      leadingStyle={{ borderRadius }}
      leading={
        <LinearGradient
          colors={
            themeColor
              ? [themeColor, lighten(0.1, themeColor)]
              : AUTO_THEME_GRADIENT_COLORS
          }
          style={{ flex: 1, width: '100%' }}
        />
      }
      title={themeTitle}
      description={
        isAuto
          ? translate('themeDescriptionAuto')
          : (themeInfo?.description ?? '')
      }
      cancelButtonText={translate('cancel')}
      confirmButtonText={translate('themeConfirmApply')}
    >
      <View style={{ borderRadius: isLEDTheme ? 0 : 16 }}>
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
              key={`theme-preview-${themeId ?? 'unknown'}`}
              recyclingKey={themeId}
              source={previewImage}
              style={styles.previewImage}
              contentFit="contain"
            />
          )}
        </View>
      </View>
    </DialogModalLayout>
  );
};
