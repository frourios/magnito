'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import { signUp } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '../../components/Auth/useUser';
import { Loading } from '../../components/Loading/Loading';
import { ManagedLogin } from '../../components/ManagedLogin/ManagedLogin';
import { Spacer } from '../../components/Spacer';
import { APP_NAME } from '../../schemas/constants';
import { pagesPath } from '../../utils/$path';
import styles from './page.module.css';

export type OptionalQuery = { code: string; state: string };

export default function Home(): React.ReactElement {
  const [hosted, setHosted] = useState<boolean | null>(null);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    setHosted(new URLSearchParams(location.search).has('client_id'));
  }, []);

  useEffect(() => {
    if (hosted === false && user.data !== null) router.replace(pagesPath.console.$url().path);
  }, [hosted, user, router]);

  if (hosted) return <ManagedLogin />;
  if (hosted === null) return <Loading visible />;

  return user.inited && user.data === null ? (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.appName}>{APP_NAME}</div>
        <Spacer axis="y" size={24} />
        <Authenticator
          signUpAttributes={['email']}
          socialProviders={['google', 'apple', 'amazon', 'facebook']}
          services={{
            handleSignUp: (input) => {
              if (!('username' in input)) throw new Error('Sign up input is missing username');

              return signUp({
                ...input,
                options: {
                  userAttributes: { ...input.options?.userAttributes },
                  ...input.options,
                  autoSignIn: true,
                },
              });
            },
          }}
        />
        <Spacer axis="y" size={40} />
      </div>
    </div>
  ) : (
    <Loading visible />
  );
}
