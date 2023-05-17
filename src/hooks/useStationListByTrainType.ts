const useStationListByTrainType = (): [
  (typeId: number) => void,
  boolean,
  Error | undefined
] => {
  const noop = () => undefined;
  return [noop, false, undefined];
};

export default useStationListByTrainType;
