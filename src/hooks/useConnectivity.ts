import { useNetworkState } from "expo-network";

const useConnectivity = (): boolean => {
	const networkState = useNetworkState();

	return networkState.isConnected ?? true;
};

export default useConnectivity;
