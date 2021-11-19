// Pixel 6で動作しないらしいので一旦常時trueにしておく
const useConnectivity = (): boolean => {
  // const { isInternetReachable } = useNetInfo();
  return true;
};

export default useConnectivity;
