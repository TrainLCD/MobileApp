import type React from 'react';
import { useCallback } from 'react';
import { FlatList, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '~/hooks';
import { LED_THEME_BG_COLOR } from '../constants';
import { APP_THEME } from '../models/Theme';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import Chip from './Chip';
import FAB from './FAB';
import { Heading } from './Heading';
import Typography from './Typography';

type SearchQueryOption = {
  id: number;
  parentId: number;
  name: string;
  color: string;
  active: boolean;
};

export type SearchQuery = {
  id: number;
  name: string;
  options: SearchQueryOption[];
};

type Props = {
  visible: boolean;
  queries: SearchQuery[];
  onClose: () => void;
  onQueryChange: (queryId: number, option: SearchQueryOption) => void;
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    height: '100%',
  },
  scrollView: {
    minHeight: isTablet ? 'auto' : '100%',
  },
  formGroup: {
    width: '100%',
  },
  formHeading: { textAlign: 'left', fontSize: RFValue(16) },
  formItem: {
    padding: 8,
  },
  subHeading: {
    fontSize: RFValue(14),
    textAlign: 'left',
    fontWeight: 'bold',
  },
});

export const FilterModal: React.FC<Props> = ({
  visible,
  queries,
  onClose,
  onQueryChange,
}: Props) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item }: { item: SearchQuery; index: number }) => {
      return (
        <View
          style={{
            ...styles.formItem,
            paddingLeft: safeAreaLeft || 24,
            paddingRight: safeAreaRight || 24,
          }}
        >
          <Typography style={styles.subHeading}>{item.name}</Typography>
          <View
            style={{
              flexDirection: 'row',
              paddingVertical: 4,
              marginVertical: 8,
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {item.options.map((opt) => (
              <Chip
                active={opt.active}
                color={opt.color}
                onPress={() =>
                  onQueryChange(item.id, { ...opt, active: !opt.active })
                }
                key={opt.id}
              >
                {opt.name}
              </Chip>
            ))}
          </View>
        </View>
      );
    },
    [onQueryChange, safeAreaLeft, safeAreaRight]
  );

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View
          style={[
            {
              backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
            },
            isTablet
              ? {
                  width: '80%',
                  maxHeight: '90%',
                  shadowOpacity: 0.25,
                  shadowColor: '#000',
                  borderRadius: 16,
                }
              : {
                  width: '100%',
                  height: '100%',
                },
          ]}
        >
          <View style={styles.formGroup}>
            <FlatList
              ListHeaderComponent={() => (
                <Heading>{translate('trainTypesFilter')}</Heading>
              )}
              contentContainerStyle={styles.scrollView}
              data={queries}
              renderItem={renderItem}
            />
          </View>
        </View>
        <FAB onPress={onClose} icon="close" />
      </View>
    </Modal>
  );
};
