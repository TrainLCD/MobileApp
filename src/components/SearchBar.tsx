import { Ionicons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import { useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FONTS } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderRadius: 8,
    height: 48,
    // iOS shadow
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    // Android shadow fallback
    elevation: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 8 : 16,
    includeFontPadding: false,
  },
  bg: {
    backgroundColor: '#fcfcfc',
  },
  ledBg: {
    backgroundColor: '#333',
  },
  button: {
    width: 48,
    height: 48,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
});

type Props = {
  onSearch?: (text: string) => void;
  nameSearch?: boolean;
};

export const SearchBar = ({ onSearch, nameSearch }: Props) => {
  const [searchText, setSearchText] = useState('');
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const fontFamily = useMemo(() => {
    if (isLEDTheme) {
      return FONTS.JFDotJiskan24h;
    }
    return FONTS.RobotoRegular;
  }, [isLEDTheme]);

  return (
    <View style={[styles.root, isLEDTheme ? styles.ledBg : styles.bg]}>
      <TextInput
        style={[
          styles.textInput,
          { color: isLEDTheme ? 'white' : 'black', fontFamily },
        ]}
        onChange={(e) => setSearchText(e.nativeEvent.text)}
        onSubmitEditing={() => onSearch?.(searchText)}
        placeholder={translate(
          nameSearch ? 'stationNameSearchPlaceholder' : 'routeSearchPlaceholder'
        )}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() => onSearch?.(searchText)}
      >
        <Ionicons name="search" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};
