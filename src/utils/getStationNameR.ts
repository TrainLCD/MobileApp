import type { Station } from "../../gen/proto/stationapi_pb";

const getStationNameR = (station: Station): string => {
	if ((station.nameRoman?.length ?? 0) <= 10) {
		return station.nameRoman ?? "";
	}
	const breaked = station.nameRoman?.split("-").join("-\n");
	if (station.nameRoman?.includes("mae") && !breaked?.includes("-\nmae")) {
		return breaked?.replace("mae", "\nmae") ?? "";
	}
	return breaked ?? "";
};

export default getStationNameR;
