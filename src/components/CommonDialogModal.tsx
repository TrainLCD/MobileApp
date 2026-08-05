import { useAtomValue } from 'jotai';
import type React from 'react';
import { StyleSheet } from 'react-native';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { RFValue } from '~/utils/rfValue';
import {
  DialogModalLayout,
  type DialogModalLayoutProps,
} from './DialogModalLayout';
import Typography from './Typography';

const styles = StyleSheet.create({
  emoji: {
    fontSize: RFValue(32),
    textAlign: 'center',
  },
});

export type CommonDialogModalProps = Omit<
  DialogModalLayoutProps,
  'isLEDTheme' | 'leading' | 'leadingStyle'
> & {
  emoji: string;
};

export const CommonDialogModal: React.FC<CommonDialogModalProps> = ({
  emoji,
  ...props
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <DialogModalLayout
      {...props}
      isLEDTheme={isLEDTheme}
      leading={<Typography style={styles.emoji}>{emoji}</Typography>}
    />
  );
};

export default CommonDialogModal;
