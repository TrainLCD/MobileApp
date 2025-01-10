import firestore from "@react-native-firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import type EligibilityDocData from "../models/FeedbackEligibility";
import type { EligibilityType } from "../models/FeedbackEligibility";
import useCachedInitAnonymousUser from "./useCachedAnonymousUser";

const useReportEligibility = (): EligibilityType | undefined => {
	const [eligibility, setEligibility] = useState<EligibilityType>();

	const user = useCachedInitAnonymousUser();

	const getEligibility = useCallback(async (): Promise<EligibilityType> => {
		if (!user) {
			return "eligible";
		}

		const eligibilitiesDoc = await firestore()
			.collection("eligibilities")
			.doc(user.uid)
			.get();

		if (!eligibilitiesDoc.exists) {
			return "eligible";
		}

		const eligibilityDocData = eligibilitiesDoc.data() as
			| EligibilityDocData
			| undefined;
		return eligibilityDocData?.eligibilityType ?? "eligible";
	}, [user]);

	useEffect(() => {
		const updateStateAsync = async () => {
			setEligibility(await getEligibility());
		};
		updateStateAsync();
	}, [getEligibility]);

	return eligibility;
};

export default useReportEligibility;
