import { Line, LineType } from "../../gen/proto/stationapi_pb";
import { JR_LINE_MAX_ID, MARK_SHAPE, OMIT_JR_THRESHOLD } from "../constants";

export const isJRLine = (line: Line): boolean =>
	line.company ? line.company.id <= JR_LINE_MAX_ID : false;

const jrCompanyColor = (companyId: number): string => {
	switch (companyId) {
		case 1: // 北海道
			return "#03c13d";
		case 2: // 東日本
			return "#378640";
		case 3: // 東海
			return "#ff7e1c";
		case 4: // 西日本
			return "#0072ba";
		case 5: // 四国
			return "#00acd1";
		case 6: // 九州
			return "#f62e36";
		default:
			return "";
	}
};

const omitJRLinesIfThresholdExceeded = (lines: Line[]): Line[] => {
	const withoutJr = lines.filter((line: Line) => !isJRLine(line));
	const jrLines = lines.filter((line: Line) => isJRLine(line));

	if (withoutJr.length === 0) {
		return jrLines;
	}

	const jrLinesWithoutBt = jrLines.filter(
		(line: Line) => line.lineType !== LineType.BulletTrain,
	);
	const jrLinesWithBt = jrLines.filter(
		(line: Line) => line.lineType === LineType.BulletTrain,
	);
	if (jrLinesWithoutBt.length >= OMIT_JR_THRESHOLD) {
		withoutJr.unshift(
			new Line({
				id: 1,
				color: jrLinesWithoutBt[0].company
					? jrCompanyColor(jrLinesWithoutBt[0].company?.id)
					: "#000000",
				nameShort: "JR線",
				nameRoman: "JR Lines",
				nameKatakana: "JRセン",
				lineType: LineType.Normal,
				nameChinese: "JR线",
				nameKorean: "JR선",
				nameFull: "JR線",
				status: 0,
				company: {
					id: 0,
					railroadId: 0,
					type: 0,
					status: 0,
					name: "JR",
					nameShort: "JR",
					nameFull: "JR",
					nameKatakana: "ジェイアール",
					nameEnglishShort: "JR",
					nameEnglishFull: "JR",
				},
				lineSymbols: [
					{
						symbol: "",
						shape: MARK_SHAPE.JR_UNION,
						color: jrLinesWithoutBt[0].company
							? jrCompanyColor(jrLinesWithoutBt[0].company?.id)
							: "#000000",
					},
				],
			}),
		);
		if (jrLinesWithBt.length > 0) {
			withoutJr.unshift(
				new Line({
					id: jrLinesWithBt[0].id,
					color: jrLinesWithBt[0].company
						? jrCompanyColor(jrLinesWithBt[0].company?.id)
						: "#000000",
					nameShort: "新幹線",
					nameRoman: "Shinkansen",
					nameKatakana: "シンカンセン",
					lineType: LineType.Normal,
					nameChinese: "新干线",
					nameKorean: "신칸센",
					nameFull: "新幹線",
					status: 0,
					company: {
						id: 0,
						railroadId: 0,
						type: 0,
						status: 0,
						name: "JR",
						nameShort: "JR",
						nameFull: "JR",
						nameKatakana: "ジェイアール",
						nameEnglishShort: "JR",
						nameEnglishFull: "JR",
					},
					lineSymbols: [
						{
							symbol: "",
							shape: MARK_SHAPE.BULLET_TRAIN_UNION,
							color: jrLinesWithoutBt[0].company
								? jrCompanyColor(jrLinesWithoutBt[0].company?.id)
								: "#000000",
						},
					],
				}),
			);
		}
		return withoutJr;
	}
	return lines;
};

export default omitJRLinesIfThresholdExceeded;
