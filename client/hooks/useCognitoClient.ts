import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { atom, useAtom, useAtomValue } from 'jotai';
import type { DefaultsDto } from 'schemas/defaults';

const defaultsAtom = atom<DefaultsDto | { [Key in keyof DefaultsDto]?: undefined }>({});
const clientAtom = atom((get) => {
  const defaults = get(defaultsAtom);

  return new CognitoIdentityProviderClient(
    defaults.accessKey
      ? {
          endpoint: location.origin,
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
