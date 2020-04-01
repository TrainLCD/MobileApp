import i18n from 'i18n-js';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import SvgUri from 'react-native-svg-uri';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    },
    text: {
    fontSize: 21,
    fontWeight: 'bold',
    width: '40%',
    marginLeft: 21,
  },
});

const SubwayWarning = () => {
  return (
    <View style={styles.root}>
        <SvgUri
          width={100}
          height={100}
          source={require('../../../assets/icons/subway.svg')}
        />
        <Text style={styles.text}>{i18n.t('subwayMain')}</Text>
    </View>
  );
};

export default SubwayWarning;
