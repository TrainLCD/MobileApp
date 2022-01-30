import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import FAB from '../../components/FAB';
import Heading from '../../components/Heading';
import useMirroringShare from '../../hooks/useMirroringShare';
import { translate } from '../../translation';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  settingItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginBottom: 32,
  },
  stationNameInput: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 12,
    width: '100%',
    marginBottom: 24,
    color: 'black',
    fontSize: RFValue(14),
    marginTop: 16,
  },
});

const ConnectMirroringShareSettings: React.FC = () => {
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets();

  const navigation = useNavigation();
  const [publisherId, setPublisherId] = useState('');
  const { startSubscribe } = useMirroringShare();

  const handlePressBack = useCallback(async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    try {
      await startSubscribe(publisherId.trim());

      navigation.navigate('Main');
    } catch (err) {
      Alert.alert(
        translate('errorTitle'),
        (err as { message: string }).message
      );
    }
  }, [navigation, publisherId, startSubscribe]);

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Heading>{translate('msConnectTitle')}</Heading>
      <View
        style={{
          ...styles.settingItem,
          marginLeft: safeAreaLeft,
          marginRight: safeAreaRight,
        }}
      >
        <TextInput
          autoFocus
          placeholder={translate('mirroringShareConnectIDPlaceholder')}
          value={publisherId}
          style={styles.stationNameInput}
          onChangeText={setPublisherId}
          onKeyPress={handleKeyPress}
        />
        <Button onPress={handleSubmit}>{translate('connect')}</Button>
      </View>

      <FAB onPress={handlePressBack} icon="md-close" />
    </KeyboardAvoidingView>
  );
};

export default ConnectMirroringShareSettings;
