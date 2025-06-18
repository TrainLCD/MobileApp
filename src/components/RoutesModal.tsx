import {
  FlatList,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { Route, Station, TrainType } from '~/gen/proto/stationapi_pb';
import { isJapanese, translate } from '~/translation';
import { HalfModal } from './HalfModal';
import Typography from './Typography';
import sortedUniqBy from 'lodash/sortedUniqBy';

type Props = {
  open: boolean;
  title: string;
  routes: Route[];
  departureStation: Station | null;
  onDismiss: () => void;
  onSelectTrainType: (trainType: TrainType | null, stops: Station[]) => void;
};

export const RoutesModal = ({
  open,
  title,
  routes,
  departureStation,
  onDismiss,
  onSelectTrainType,
}: Props) => {
  const { height: windowHeight } = useWindowDimensions();

  return (
    <HalfModal open={open} title={title} onDismiss={onDismiss}>
      <View style={{ flex: 1, paddingHorizontal: 24, gap: 32 }}>
        <View style={{ gap: 8 }}>
          <Typography
            style={{ fontWeight: 'bold', color: '#8E8E93', fontSize: 16 }}
          >
            {translate('searchResult')}
          </Typography>

          <FlatList
            ListEmptyComponent={
              <Typography style={{ fontSize: 16, fontWeight: 'bold' }}>
                {translate('noRoutes')}
              </Typography>
            }
            style={{ maxHeight: windowHeight / 2 }}
            initialNumToRender={routes.length}
            data={routes}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item: route }) => (
              <TouchableOpacity
                onPress={() =>
                  onSelectTrainType(
                    route.stops.find(
                      (s) => s.groupId === departureStation?.groupId
                    )?.trainType ?? null,
                    route.stops
                  )
                }
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginLeft: 16,
                  paddingVertical: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography style={{ fontWeight: 'bold', fontSize: 16 }}>
                    {isJapanese
                      ? `${
                          route.stops.find(
                            (s) => s.groupId === departureStation?.groupId
                          )?.line?.nameShort
                        } ${
                          route.stops.find(
                            (s) => s.groupId === departureStation?.groupId
                          )?.trainType?.name
                        }`
                      : `${
                          route.stops.find(
                            (s) => s.groupId === departureStation?.groupId
                          )?.line?.nameShort
                        } ${
                          route.stops.find(
                            (s) => s.groupId === departureStation?.groupId
                          )?.trainType?.nameRoman
                        }`}
                  </Typography>

                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {sortedUniqBy(route.stops, (s) => s.line?.id)?.map((s) => (
                      <View
                        key={s?.line?.id}
                        style={{
                          width: 12,
                          height: 12,
                          backgroundColor: s.line?.color,
                          borderRadius: 6,
                        }}
                      />
                    ))}
                  </View>
                  <Typography style={{ fontWeight: 'bold', color: '#8E8E93' }}>
                    {isJapanese
                      ? route.stops[0]?.name
                      : route.stops[0]?.nameRoman}
                    駅から
                    {isJapanese
                      ? route.stops[route.stops.length - 1]?.name
                      : route.stops[route.stops.length - 1]?.nameRoman}
                    駅まで
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
