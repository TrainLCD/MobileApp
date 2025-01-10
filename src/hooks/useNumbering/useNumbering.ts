import { useEffect, useMemo, useState } from "react";
import { useRecoilValue } from "recoil";
import {
	type StationNumber,
	TrainTypeKind,
} from "../../../gen/proto/stationapi_pb";
import { JOBAN_LINE_IDS } from "../../constants";
import stationState from "../../store/atoms/station";
import getIsPass from "../../utils/isPass";
import { useCurrentLine } from "../useCurrentLine";
import { useCurrentStation } from "../useCurrentStation";
import useCurrentTrainType from "../useCurrentTrainType";
import { useNextStation } from "../useNextStation";
import useStationNumberIndexFunc from "../useStationNumberIndexFunc";

export const useNumbering = (
	priorCurrent?: boolean,
): [StationNumber | undefined, string | undefined] => {
	const { arrived, selectedBound } = useRecoilValue(stationState);
	const stoppedCurrentStation = useCurrentStation(true);
	const trainType = useCurrentTrainType();

	const [stationNumber, setStationNumber] = useState<StationNumber>();
	const [threeLetterCode, setThreeLetterCode] = useState<string>();

	const currentLine = useCurrentLine();
	const currentStation = useCurrentStation();
	const nextStation = useNextStation(true, currentLine?.station);

	const getStationNumberIndex = useStationNumberIndexFunc();

	const currentStationNumberIndex = useMemo(
		() => getStationNumberIndex(stoppedCurrentStation ?? null),
		[getStationNumberIndex, stoppedCurrentStation],
	);
	const nextStationNumberIndex = useMemo(
		() => getStationNumberIndex(nextStation ?? null),
		[getStationNumberIndex, nextStation],
	);

	const isJobanLineRapid = useMemo(
		() =>
			currentLine &&
			JOBAN_LINE_IDS.includes(currentLine?.id) &&
			trainType?.kind === TrainTypeKind.Rapid,
		[currentLine, trainType?.kind],
	);

	useEffect(() => {
		if (!selectedBound) {
			setStationNumber(undefined);
			setThreeLetterCode(undefined);
		}
	}, [selectedBound]);

	useEffect(() => {
		if (!selectedBound || !stoppedCurrentStation) {
			return;
		}

		if (priorCurrent && !getIsPass(stoppedCurrentStation)) {
			if (isJobanLineRapid) {
				const jjNumber = stoppedCurrentStation.stationNumbers.find(
					(num) => num.lineSymbol === "JJ",
				);
				if (jjNumber) {
					setStationNumber(jjNumber);
				}
			} else {
				setStationNumber(
					stoppedCurrentStation?.stationNumbers?.[currentStationNumberIndex],
				);
			}

			setThreeLetterCode(stoppedCurrentStation?.threeLetterCode);
			return;
		}

		// 到着していて、かつ停車駅でない場合は、次の駅の番号を表示する
		// 到着していない場合は無条件で次の駅の番号を表示する
		if (
			(arrived && getIsPass(currentStation)) ||
			!arrived ||
			priorCurrent === false // priorCurrentを特に指定していない時にデグレしないようにした
		) {
			if (isJobanLineRapid) {
				const jjNumber = nextStation?.stationNumbers.find(
					(num) => num.lineSymbol === "JJ",
				);

				if (jjNumber) {
					setStationNumber(jjNumber);
				}
			} else {
				setStationNumber(nextStation?.stationNumbers?.[nextStationNumberIndex]);
			}

			setThreeLetterCode(nextStation?.threeLetterCode);
			return;
		}

		if (isJobanLineRapid) {
			const jjNumber = stoppedCurrentStation?.stationNumbers.find(
				(num) => num.lineSymbol === "JJ",
			);
			if (jjNumber) {
				setStationNumber(jjNumber);
			}
		} else {
			setStationNumber(
				stoppedCurrentStation?.stationNumbers?.[currentStationNumberIndex],
			);
		}
		setThreeLetterCode(stoppedCurrentStation?.threeLetterCode);
	}, [
		arrived,
		currentStation,
		currentStationNumberIndex,
		isJobanLineRapid,
		nextStation?.stationNumbers,
		nextStation?.threeLetterCode,
		nextStationNumberIndex,
		priorCurrent,
		selectedBound,
		stoppedCurrentStation,
	]);

	return [stationNumber, threeLetterCode];
};
