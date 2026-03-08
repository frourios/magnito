'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { AuthLoader } from 'components/Auth/AuthLoader';
import type { PropsWithChildren } from 'react';
import { Suspense } from 'react';
import '../styles/globals.css';

export function RootLayoutContent({ children }: PropsWithChildren): React.ReactElement {
  return (
    <Authenticator.Provider>
      <AuthLoader />
      <Suspense>{children}</Suspense>
    </Authenticator.Provider>
  );
}
