import { useEffect } from 'react';
import { RecoilValue, useRecoilValue } from 'recoil';

type Props<T> = {
  node: RecoilValue<T>;
  onChange: (value: T) => void;
};

const RecoilObserver = <T,>({ node, onChange }: Props<T>): null => {
  const value = useRecoilValue(node);
  useEffect(() => onChange(value), [onChange, value]);
  return null;
};

export default RecoilObserver;
