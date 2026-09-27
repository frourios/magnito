'use client';

import { translations } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import { I18n } from 'aws-amplify/utils';
import type { PropsWithChildren } from 'react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useCognitoClient } from '../hooks/useCognitoClient';
import { RootLayoutContent } from '../layouts/RootLayoutContent';
import { APP_NAME } from '../schemas/constants';
import { staticPath } from '../utils/$path';
import { apiClient } from '../utils/apiClient';
import { catchApiErr } from '../utils/catchApiErr';
import '../styles/globals.css';

if (typeof window !== 'undefined') {
  I18n.putVocabularies(translations);

  const lang = navigator.language.split('-')[0];

  if (lang) I18n.setLanguage(lang);
}

export default function RootLayout({ children }: PropsWithChildren): React.ReactElement {
  const { defaults, setDefaults } = useCognitoClient();
  const [hostedLogin, setHostedLogin] = useState<boolean | null>(null);

  useEffect(() => {
    const path = location.pathname;
    setHostedLogin(
      path.startsWith('/oauth2/') ||
        ['/signup', '/confirm', '/forgotPassword', '/confirmforgotPassword'].includes(path) ||
        (path === '/login' && new URLSearchParams(location.search).has('client_id')),
    );
  }, []);

  useMemo(() => {
    if (defaults.userPoolId === undefined) return;

    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: defaults.userPoolId,
          userPoolClientId: defaults.userPoolClientId,
          userPoolEndpoint: location.origin,
          loginWith: {
            oauth: {
              domain: defaults.oauthDomain,
              scopes: ['openid', 'profile', 'aws.cognito.signin.user.admin'],
              redirectSignIn: [location.origin],
              redirectSignOut: [location.origin],
              responseType: 'code',
            },
          },
        },
      },
    });
  }, [defaults]);

  useEffect(() => {
    if (hostedLogin !== false) return;
    apiClient['publicApi/defaults'].$get().then(setDefaults).catch(catchApiErr);
  }, [hostedLogin, setDefaults]);

  return (
    <html lang="ja">
      <head>
        <title>{APP_NAME}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content={APP_NAME} />
        <link rel="icon" href={staticPath.images.favicon_png} />
      </head>
      <body>
        {hostedLogin ? (
          <Suspense>{children}</Suspense>
        ) : (
          defaults.userPoolId && <RootLayoutContent>{children}</RootLayoutContent>
        )}
      </body>
    </html>
  );
}
