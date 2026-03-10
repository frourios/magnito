import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { DefaultConfigs } from 'common/types/api';
import { atom, useAtom, useAtomValue } from 'jotai';
import { NEXT_PUBLIC_API_ORIGIN } from 'utils/clientEnvs';

const defaultsAtom = atom<DefaultConfigs | { [Key in keyof DefaultConfigs]?: undefined }>({});
const clientAtom = atom((get) => {
  const defaults = get(defaultsAtom);

  return new CognitoIdentityProviderClient(
    defaults.accessKey
      ? {
          endpoint: NEXT_PUBLIC_API_ORIGIN,
          region: defaults.region,
          credentials: { accessKeyId: defaults.accessKey, secretAccessKey: defaults.secretKey },
        }
      : {},
  );
});

export const useCognitoClient = () => {
  const [defaults, setDefaults] = useAtom(defaultsAtom);
  const cognitoClient = useAtomValue(clientAtom);

  return { defaults, setDefaults, cognitoClient };
};
