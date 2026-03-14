import { atom, useAtom } from 'jotai';
import { useCallback } from 'react';
import { Loading } from './Loading';

const countAtom = atom(0);

export const useLoading = () => {
  const [count, setCount] = useAtom(countAtom);
  const setLoading = useCallback(
    (enabled: boolean) => setCount((c) => c + (enabled ? 1 : -1)),
    [setCount],
  );

  return { loadingElm: <Loading visible={count > 0} />, setLoading };
};
