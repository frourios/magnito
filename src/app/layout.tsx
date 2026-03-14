'use client';

import { translations } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import { I18n } from 'aws-amplify/utils';
import type { PropsWithChildren } from 'react';
import { useEffect, useMemo } from 'react';
import { useCognitoClient } from 'src/hooks/useCognitoClient';
import { RootLayoutContent } from 'src/layouts/RootLayoutContent';
import { APP_NAME } from 'src/schemas/constants';
import { staticPath } from 'src/utils/$path';
import { apiClient } from 'src/utils/apiClient';
import { catchApiErr } from 'src/utils/catchApiErr';
import '../styles/globals.css';

if (typeof window !== 'undefined') {
  I18n.putVocabularies(translations);

  const lang = navigator.language.split('-')[0];

  if (lang) I18n.setLanguage(lang);
}

export default function RootLayout({ children }: PropsWithChildren): React.ReactElement {
  const { defaults, setDefaults } = useCognitoClient();

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
    apiClient['publicApi/defaults'].$get().then(setDefaults).catch(catchApiErr);
  }, [setDefaults]);

  return (
    <html lang="ja">
      <head>
        <title>{APP_NAME}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content={APP_NAME} />
        <link rel="icon" href={staticPath.images.favicon_png} />
      </head>
      <body>{defaults.userPoolId && <RootLayoutContent>{children}</RootLayoutContent>}</body>
    </html>
  );
}
