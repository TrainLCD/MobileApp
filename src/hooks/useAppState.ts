import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

const useAppState = (): AppStateStatus => {
	const [appState, setAppState] = useState(AppState.currentState);

	useEffect(() => {
		const subscription = AppState.addEventListener("change", setAppState);
		return subscription.remove;
	}, [setAppState]);

	return appState;
};

export default useAppState;
