import { useEffect } from "react";
import { useRecoilSnapshot } from "recoil";

const RecoilDebugObserver = () => {
	const snapshot = useRecoilSnapshot();
	useEffect(() => {
		for (const node of snapshot.getNodes_UNSTABLE({ isModified: true })) {
		}
	}, [snapshot]);

	return null;
};

export default RecoilDebugObserver;
