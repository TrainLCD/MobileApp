import React, { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import type { Route } from "../../gen/proto/stationapi_pb";
import { useCurrentStation } from "../hooks/useCurrentStation";
import { useThemeStore } from "../hooks/useThemeStore";
import { APP_THEME } from "../models/Theme";
import { isJapanese } from "../translation";
import { RFValue } from "../utils/rfValue";
import Typography from "./Typography";

const styles = StyleSheet.create({
	cell: { padding: 12 },
	stationNameText: {
		fontSize: RFValue(14),
	},
	descriptionText: {
		fontSize: RFValue(11),
		marginTop: 8,
	},
	separator: { height: 1, width: "100%", backgroundColor: "#aaa" },
});

const Separator = () => <View style={styles.separator} />;

const ItemCell = ({
	item,
	loading,
	onSelect,
}: {
	item: Route;
	loading: boolean;
	onSelect: (item: Route) => void;
}) => {
	const currentStation = useCurrentStation();

	const lineNameTitle = useMemo(() => {
		const trainType = item.stops.find(
			(stop) => stop.groupId === Number(currentStation?.groupId),
		)?.trainType;

		if (!isJapanese) {
			const lineName = item.stops.find(
				(s) => s.groupId === currentStation?.groupId,
			)?.line?.nameRoman;
			const typeName = trainType?.nameRoman ?? "Local";

			return `${lineName} ${typeName}`;
		}
		const lineName = item.stops.find(
			(s) => s.groupId === currentStation?.groupId,
		)?.line?.nameShort;
		const typeName = trainType?.name ?? "普通または各駅停車";

		return `${lineName} ${typeName}`;
	}, [currentStation?.groupId, item.stops]);

	const bottomText = useMemo(() => {
		if (isJapanese) {
			return `${item.stops[0]?.name}から${
				item.stops[item.stops.length - 1]?.name
			}まで`;
		}
		return `${item.stops[0]?.nameRoman} - ${
			item.stops[item.stops.length - 1]?.nameRoman
		}`;
	}, [item.stops]);

	return (
		<TouchableOpacity
			style={styles.cell}
			onPress={() => onSelect(item)}
			disabled={loading}
		>
			<Typography style={styles.stationNameText}>{lineNameTitle}</Typography>
			<Typography style={styles.descriptionText} numberOfLines={1}>
				{bottomText}
			</Typography>
		</TouchableOpacity>
	);
};

export const RouteList = ({
	routes,
	onSelect,
	loading,
}: {
	routes: Route[];
	onSelect: (item: Route | undefined) => void;
	loading: boolean;
}) => {
	const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

	const renderItem = useCallback(
		({ item }: { item: Route; index: number }) => {
			return <ItemCell item={item} onSelect={onSelect} loading={loading} />;
		},
		[loading, onSelect],
	);
	const keyExtractor = useCallback((item: Route) => item.id.toString(), []);

	return (
		<FlatList
			initialNumToRender={routes.length}
			style={{
				width: "100%",
				height: "100%",
				alignSelf: "center",
				borderColor: isLEDTheme ? "#fff" : "#aaa",
				borderWidth: 1,
				flex: 1,
			}}
			data={routes}
			renderItem={renderItem}
			keyExtractor={keyExtractor}
			ItemSeparatorComponent={Separator}
			ListFooterComponent={Separator}
		/>
	);
};
