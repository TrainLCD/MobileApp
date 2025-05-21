import { type Atom, useAtomValue } from 'jotai';
import { useEffect } from 'react';

type Props<T> = {
  node: Atom<T>;
  onChange: (value: T) => void;
};

const JotaiObserver = <T,>({ node, onChange }: Props<T>): null => {
  const value = useAtomValue(node);
  useEffect(() => onChange(value), [onChange, value]);
  return null;
};

export default JotaiObserver;
