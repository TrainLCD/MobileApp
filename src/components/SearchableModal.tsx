import {
  FlatList,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Searchbar } from 'react-native-paper';
import type { Station } from '~/gen/proto/stationapi_pb';
import { isJapanese, translate } from '~/translation';
import { HalfModal } from './HalfModal';
import Typography from './Typography';

type Props = {
  open: boolean;
  title: string;
  searchQuery: string;
  stations: Station[];
  closestStation: Station | null;
  onUpdateSearchQuery: (query: string) => void;
  onDismiss: () => void;
  onSelectStation: (station: Station) => void;
};

export const SearchableModal = ({
  open,
  title,
  searchQuery,
  stations,
  closestStation,
  onUpdateSearchQuery,
  onDismiss,
  onSelectStation,
}: Props) => {
  const { height: windowHeight } = useWindowDimensions();

  return (
    <HalfModal open={open} title={title} onDismiss={onDismiss}>
      <View style={{ flex: 1, paddingHorizontal: 24, gap: 32 }}>
        <Searchbar
          placeholder={translate('enterStationName')}
          value={searchQuery}
          onChangeText={
            ((query: string) => {
              onUpdateSearchQuery(query);
              if (!query.trim().length) {
                return;
              }

              onUpdateSearchQuery(query);
            }) as never // NOTE: ライブラリの型構成がうんち
          }
        />
        <View style={{ gap: 8 }}>
          <Typography
            style={{ fontWeight: 'bold', color: '#8E8E93', fontSize: 16 }}
          >
            {translate('stationNearMe')}
          </Typography>

          <TouchableOpacity
            onPress={() => closestStation && onSelectStation(closestStation)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                marginTop: 16,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: '#000000',
                  borderRadius: 16,
                }}
              />
              <Typography style={{ fontWeight: 'bold', fontSize: 16 }}>
                {isJapanese ? closestStation?.name : closestStation?.nameRoman}
              </Typography>
            </View>

            <Typography style={{ fontSize: 16, color: '#8E8E93' }}>
              {translate('distance', {
                meters: closestStation?.distance ?? 0,
              })}
            </Typography>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 8 }}>
          <Typography
            style={{ fontWeight: 'bold', color: '#8E8E93', fontSize: 16 }}
          >
            {translate('searchResult')}
          </Typography>

          <FlatList
            style={{ maxHeight: windowHeight / 2 }}
            initialNumToRender={stations.length}
            data={stations}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item: station }) => (
              <TouchableOpacity
                onPress={() => onSelectStation(station)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                    marginTop: 16,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: '#000000',
                      borderRadius: 16,
                    }}
                  />
                  <Typography style={{ fontWeight: 'bold', fontSize: 16 }}>
                    {isJapanese ? station.name : station.nameRoman}
                  </Typography>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </HalfModal>
  );
};
