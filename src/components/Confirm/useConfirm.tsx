import { atom, useAtom } from 'jotai';
import { useCallback } from 'react';
import { Confirm } from './Confirm';

const confirmAtom = atom<{ text: string | null; resolve: null | ((val: boolean) => void) }>({
  text: null,
  resolve: null,
});

export const useConfirm = () => {
  const [confirmParams, setConfirmParams] = useAtom(confirmAtom);
  const setConfirm = useCallback(
    (text: string) => {
      setConfirmParams((params) => ({ ...params, text }));
      return new Promise<boolean>((resolve) =>
        setConfirmParams((params) => ({ ...params, resolve })),
      );
    },
    [setConfirmParams],
  );
  const agreeConfirm = useCallback(() => {
    setConfirmParams((params) => ({ ...params, text: null }));
    confirmParams.resolve?.(true);
  }, [confirmParams, setConfirmParams]);
  const cancelConfirm = useCallback(() => {
    setConfirmParams((params) => ({ ...params, text: null }));
    confirmParams.resolve?.(false);
  }, [confirmParams, setConfirmParams]);

  return {
    confirmElm: confirmParams.text !== null && (
      <Confirm text={confirmParams.text} ok={agreeConfirm} cancel={cancelConfirm} />
    ),
    setConfirm,
  };
};
