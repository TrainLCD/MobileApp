import { useActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ReadDirItem } from 'react-native-fs';
import { RFValue } from 'react-native-responsive-fontsize';
import Share from 'react-native-share';
import FAB from '../components/FAB';
import Heading from '../components/Heading';
import useRecordRoute from '../hooks/useRecordRoute';
import { translate } from '../translation';

const styles = StyleSheet.create({
  rootPadding: {
    padding: 72,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  heading: {
    marginBottom: 24,
  },
  emptyText: {
    fontSize: RFValue(16),
    textAlign: 'center',
    marginTop: 12,
    fontWeight: 'bold',
  },
  cell: {
    flex: 1,
    padding: 12,
  },
  stationNameText: {
    fontSize: RFValue(14),
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#aaa',
  },
  flatList: {
    borderColor: '#aaa',
  },
});

const ListEmptyComponent: React.FC = () => {
  return <Text style={styles.emptyText}>{translate('savedRoutesEmpty')}</Text>;
};

interface GPXFileCellProps {
  item: ReadDirItem;
  onPress: (item: ReadDirItem) => void;
}

const GPXFileCell: React.FC<GPXFileCellProps> = ({
  item,
  onPress,
}: GPXFileCellProps) => {
  const handleOnPress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);
  return (
    <TouchableOpacity style={styles.cell} onPress={handleOnPress}>
      <Text style={styles.stationNameText}>
        {`${item.name}(${dayjs(item.mtime).format()})`}
      </Text>
    </TouchableOpacity>
  );
};

const DumpedGPXSettings: React.FC = () => {
  const navigation = useNavigation();
  const keyExtractor = useCallback((item: ReadDirItem) => item.name, []);
  const { getDumpedGPXFileList } = useRecordRoute(true);
  const [savedGPXFiles, setSavedGPXFiles] = useState<ReadDirItem[]>([]);
  const { showActionSheetWithOptions } = useActionSheet();

  useEffect(() => {
    const getGPXFilesAsync = async () => {
      setSavedGPXFiles((await getDumpedGPXFileList()).reverse());
    };
    getGPXFilesAsync();
  }, [getDumpedGPXFileList]);

  const actionSheetOptions = useMemo(
    () => [translate('share'), translate('cancel')],
    []
  );

  const handleShare = useCallback(async (file: ReadDirItem) => {
    await Share.open({
      title: file.name,
      failOnCancel: false,
      url: file.path,
    });
  }, []);

  const handleFilePress = useCallback(
    (file: ReadDirItem) => {
      showActionSheetWithOptions(
        {
          options: actionSheetOptions,
          cancelButtonIndex: actionSheetOptions.length - 1,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              handleShare(file);
              break;
            default:
              break;
          }
        }
      );
    },
    [actionSheetOptions, handleShare, showActionSheetWithOptions]
  );

  const renderGPXFileCell = useCallback(
    ({ item }) => (
      <>
        <GPXFileCell onPress={() => handleFilePress(item)} item={item} />
        <View style={styles.divider} />
      </>
    ),
    [handleFilePress]
  );

  return (
    <>
      <View style={styles.rootPadding}>
        <Heading style={styles.heading}>{translate('dumpGPXSettings')}</Heading>

        <View
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <FlatList
            style={{
              ...styles.flatList,
              borderWidth: savedGPXFiles.length ? 1 : 0,
            }}
            data={savedGPXFiles}
            renderItem={renderGPXFileCell}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmptyComponent}
          />
        </View>
      </View>
      <FAB onPress={navigation.goBack} icon="md-close" />
    </>
  );
};

export default DumpedGPXSettings;
