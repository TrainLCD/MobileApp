import { useAtomValue } from 'jotai';
import type React from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import {
  getTrainTypeTextColor,
  normalizeTrainTypeColor,
} from '~/utils/trainTypeTextColor';
import Button from '../components/Button';
import { Heading } from '../components/Heading';
import { LED_THEME_BG_COLOR } from '../constants';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { translate } from '../translation';
import { CustomModal } from './CustomModal';
import { ToggleButton } from './ToggleButton';
import Typography from './Typography';

const styles = StyleSheet.create({
  contentView: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 24,
    minHeight: 256,
  },
  buttonsContainer: {
    gap: 8,
    marginTop: 24,
    width: '100%',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
  },
  closeButton: { marginTop: 24 },
  closeButtonText: { fontWeight: 'bold' },
  trainTypeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: isTablet ? 64 : 56,
    paddingHorizontal: 24,
    elevation: 1,
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#008ffe',
  },
  trainTypeLabel: {
    fontSize: isTablet ? RFValue(12) : RFValue(14),
    fontWeight: 'bold',
    color: '#008ffe',
    flex: 1,
    marginRight: 12,
  },
  trainTypeNamePanel: {
    minWidth: isTablet ? 96 : 64,
    maxWidth: '50%',
    height: isTablet ? 40 : 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  trainTypeNameText: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
  },
  trainTypeNameParens: {
    fontSize: RFValue(9),
    fontWeight: 'bold',
  },
  trainTypeDisabledText: {
    fontSize: isTablet ? RFValue(12) : RFValue(14),
    fontWeight: 'bold',
    color: '#008ffe',
  },
  heading: { width: '100%' },
});

const renderWithSmallParens = (text: string) => {
  const parts = text.split(/(\([^)]*\))/);
  return parts.map((part, index) =>
    /^\(.*\)$/.test(part) ? (
      <Typography key={`${index}-${part}`} style={styles.trainTypeNameParens}>
        {part}
      </Typography>
    ) : (
      part
    )
  );
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCloseAnimationEnd?: () => void;
  autoModeEnabled: boolean;
  toggleAutoModeEnabled: () => void;
  trainTypeName?: string;
  trainTypeColor?: string;
  trainTypeLoading?: boolean;
  onTrainTypePress?: () => void;
  trainTypeDisabled?: boolean;
  themeLabel?: string;
  themeColor?: string;
  onThemePress?: () => void;
};

export const SelectBoundSettingListModal: React.FC<Props> = ({
  visible,
  onClose,
  onCloseAnimationEnd,
  autoModeEnabled,
  toggleAutoModeEnabled,
  trainTypeName,
  trainTypeColor,
  trainTypeLoading,
  onTrainTypePress,
  trainTypeDisabled,
  themeLabel,
  themeColor,
  onThemePress,
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const normalizedTrainTypeColor = useMemo(
    () => normalizeTrainTypeColor(trainTypeColor),
    [trainTypeColor]
  );

  const trainTypeTextColor = useMemo(
    () => getTrainTypeTextColor(trainTypeColor),
    [trainTypeColor]
  );

  const themeTextColor = useMemo(
    () => getTrainTypeTextColor(themeColor),
    [themeColor]
  );

  const normalizedThemeColor = useMemo(
    () => normalizeTrainTypeColor(themeColor),
    [themeColor]
  );

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      onCloseAnimationEnd={onCloseAnimationEnd}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      contentContainerStyle={[
        styles.contentView,
        {
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          borderRadius: isLEDTheme ? 0 : 8,
        },
        isTablet && {
          width: '80%',
          maxHeight: '90%',
          shadowOpacity: 0.25,
          shadowColor: '#333',
          borderRadius: 16,
        },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Heading style={styles.heading}>{translate('settings')}</Heading>

        <View style={styles.buttonsContainer}>
          <ToggleButton
            outline
            onToggle={toggleAutoModeEnabled}
            state={autoModeEnabled}
          >
            {translate('autoModeSettings')}
          </ToggleButton>
          {onTrainTypePress && (
            <TouchableOpacity
              onPress={trainTypeDisabled ? undefined : onTrainTypePress}
              disabled={trainTypeDisabled}
              style={[
                styles.trainTypeButton,
                {
                  backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
                  borderRadius: isLEDTheme ? 0 : 8,
                  opacity: trainTypeDisabled ? 0.5 : 1,
                },
              ]}
            >
              {trainTypeDisabled ? (
                <Typography style={styles.trainTypeDisabledText}>
                  {translate('trainTypesNotExist')}
                </Typography>
              ) : (
                <>
                  <Typography style={styles.trainTypeLabel}>
                    {translate('trainType')}
                  </Typography>
                  <View
                    style={[
                      styles.trainTypeNamePanel,
                      {
                        backgroundColor: normalizedTrainTypeColor,
                        borderRadius: isLEDTheme ? 0 : 8,
                        opacity: trainTypeLoading ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Typography
                      style={[
                        styles.trainTypeNameText,
                        { color: trainTypeTextColor },
                      ]}
                      numberOfLines={1}
                    >
                      {renderWithSmallParens(
                        trainTypeName || translate('trainTypeDefault')
                      )}
                    </Typography>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}
          {onThemePress && (
            <TouchableOpacity
              onPress={onThemePress}
              style={[
                styles.trainTypeButton,
                {
                  backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
                  borderRadius: isLEDTheme ? 0 : 8,
                },
              ]}
            >
              <Typography style={styles.trainTypeLabel}>
                {translate('theme')}
              </Typography>
              <View
                style={[
                  styles.trainTypeNamePanel,
                  {
                    backgroundColor: normalizedThemeColor,
                    borderRadius: isLEDTheme ? 0 : 8,
                  },
                ]}
              >
                <Typography
                  style={[styles.trainTypeNameText, { color: themeTextColor }]}
                  numberOfLines={1}
                >
                  {renderWithSmallParens(themeLabel ?? translate('autoTheme'))}
                </Typography>
              </View>
            </TouchableOpacity>
          )}
          <Button
            style={styles.closeButton}
            textStyle={styles.closeButtonText}
            onPress={onClose}
          >
            {translate('close')}
          </Button>
        </View>
      </ScrollView>
    </CustomModal>
  );
};
