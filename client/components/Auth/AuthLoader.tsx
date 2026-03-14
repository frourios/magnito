import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { useAlert } from 'components/Alert/useAlert';
import { useLoading } from 'components/Loading/useLoading';
import { useCallback, useEffect } from 'react';
import { apiClient } from 'utils/apiClient';
import { catchApiErr } from 'utils/catchApiErr';
import { useUser } from './useUser';

export function AuthLoader(): React.ReactElement {
  const { setUser } = useUser();
  const { setLoading } = useLoading();
  const { setAlert } = useAlert();
  const fetchUser = useCallback(async () => {
    await apiClient['privateApi/me']
      .$get()
      .catch(async () => {
        await signOut();

        return null;
      })
      .then(setUser);
  }, [setUser]);

  useEffect(() => {
    void fetchAuthSession()
      .then((e) => (e.tokens?.idToken ? fetchUser() : setUser(null)))
      .catch(catchApiErr);
  }, [fetchUser, setUser]);

  useEffect(() => {
    return Hub.listen(
      'auth',
      // eslint-disable-next-line complexity
      async (data) => {
        switch (data.payload.event) {
          case 'customOAuthState':
          case 'signInWithRedirect':
          case 'signInWithRedirect_failure':
          case 'tokenRefresh':
            break;
          case 'signedOut':
            await apiClient['publicApi/session'].$delete().catch(catchApiErr);
            setUser(null);
            break;
          case 'signedIn': {
            const result = await fetchAuthSession().catch(catchApiErr);

            if (result?.tokens?.idToken) {
              await apiClient['publicApi/session']
                .$post({ body: { jwt: result.tokens.idToken.toString() } })
                .then(fetchUser)
                .catch(catchApiErr);
            }

            break;
          }
          case 'tokenRefresh_failure':
            await signOut();
            break;
          /* v8 ignore next 2 */
          default:
            throw new Error(data.payload satisfies never);
        }
      },
    );
  }, [setAlert, fetchUser, setLoading, setUser]);

  return <></>;
}
