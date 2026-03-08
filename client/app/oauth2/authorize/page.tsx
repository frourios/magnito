'use client';

import useAspidaSWR from '@aspida/swr';
import type { OAuthConfig } from '@aws-amplify/core';
import word from '@fakerjs/word';
import { APP_NAME, PROVIDER_LIST } from 'common/constants';
import type { MaybeId } from 'common/types/brandedId';
import type { SocialUserEntity } from 'common/types/user';
import { Spacer } from 'components/Spacer';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { apiClient } from 'utils/apiClient';
import { z } from 'zod';
import styles from './page.module.css';

export type Query = {
  redirect_uri: string;
  client_id: MaybeId['userPoolClient'];
  identity_provider: string;
  scope: OAuthConfig['scopes'];
  state: string;
} & (
  | { response_type: 'code'; code_challenge: string; code_challenge_method: 'plain' | 'S256' }
  | { response_type: 'token' }
);

const AddAccount = (props: {
  provider: (typeof PROVIDER_LIST)[number];
  codeChallenge: string;
  userPoolClientId: MaybeId['userPoolClient'];
  onAdded: (user: SocialUserEntity) => void;
  onBack: () => void;
}) => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const data = z
    .object({
      email: z.string().email(),
      name: z.string(),
      photoUrl: z.literal('').or(z.string().url().optional()),
    })
    .safeParse({ email, name: displayName, photoUrl });
  const setFakeVals = () => {
    const fakeWord = word({ length: 8 });

    setEmail(`${fakeWord}@${props.provider.toLowerCase()}.com`);
    setDisplayName(fakeWord);
  };
  const addUser = async () => {
    if (!data.success) return;

    const user = await apiClient.public.socialUsers.$post({
      body: {
        ...data.data,
        photoUrl: photoUrl || undefined,
        provider: props.provider,
        codeChallenge: props.codeChallenge,
        userPoolClientId: props.userPoolClientId,
      },
    });

    props.onAdded(user);
  };

  return (
    <div>
      <button className={styles.btn} onClick={setFakeVals}>
        Auto-generate user information
      </button>
      <Spacer axis="y" size={20} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addUser();
        }}
      >
        <div className={styles.inputLabel}>Email</div>
        <Spacer axis="y" size={4} />
        <input
          type="email"
          className={styles.textInput}
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
        <Spacer axis="y" size={16} />
        <div className={styles.inputLabel}>Display name (optional)</div>
        <Spacer axis="y" size={4} />
        <input
          type="text"
          className={styles.textInput}
          value={displayName}
          onChange={(e) => setDisplayName(e.currentTarget.value)}
        />
        <Spacer axis="y" size={16} />
        <div className={styles.inputLabel}>Profile photo URL (optional)</div>
        <Spacer axis="y" size={4} />
        <input
          type="text"
          className={styles.textInput}
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.currentTarget.value)}
        />
        <Spacer axis="y" size={24} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className={styles.btn} onClick={props.onBack}>
            ← Back
          </button>
          <button type="submit" className={styles.submitBtn} disabled={!data.success}>
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
};

// eslint-disable-next-line complexity
const Authorize = () => {
  const router = useRouter();
  const userPoolClientId = router.query.client_id as MaybeId['userPoolClient'];
  const codeChallenge = router.query.code_challenge as string;
  const state = router.query.state as string;
  const redirectUri = router.query.redirect_uri as string;
  const provider = z
    .enum(PROVIDER_LIST)
    .parse(
      (router.query.identity_provider as string | undefined)?.replace(/^.+([A-Z][a-z]+)$/, '$1') ??
        'Google',
    );
  const { data: users } = useAspidaSWR(apiClient.public.socialUsers, {
    query: { userPoolClientId },
  });
  const filteredUsers = users?.filter((user) => user.provider === provider) ?? [];
  const [mode, setMode] = useState<'default' | 'add'>('default');
  const redirect = (user: SocialUserEntity) => {
    location.href = `${redirectUri}?code=${user.authorizationCode}&state=${state}`;
  };
  const selectAccount = async (user: SocialUserEntity) => {
    await apiClient.public.socialUsers
      .$patch({ body: { id: user.id, codeChallenge } })
      .then(redirect);
  };

  return (
    <div className={styles.container}>
      <h1>Sign-in with {provider}</h1>
      <Spacer axis="y" size={8} />
      {filteredUsers.length > 0 ? (
        <>
          <div className={styles.desc}>Please select an existing account or add a new one.</div>
          <Spacer axis="y" size={16} />
          {filteredUsers.map((user) => (
            <div key={user.id} className={styles.userInfo} onClick={() => selectAccount(user)}>
              <div
                className={styles.userIcon}
                style={{
                  backgroundImage: user.attributes.some((attr) => attr.name === 'picture')
                    ? `url(${user.attributes.find((attr) => attr.name === 'picture')?.value})`
                    : undefined,
                }}
              />
              <div>
                <div className={styles.userName}>{user.name}</div>
                <div className={styles.userEmail}>{user.email}</div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className={styles.desc}>
          No {provider} accounts exist in {APP_NAME}.
        </div>
      )}
      <Spacer axis="y" size={20} />
      {mode === 'default' ? (
        <button className={styles.btn} onClick={() => setMode('add')}>
          + Add new account
        </button>
      ) : (
        <AddAccount
          provider={provider}
          codeChallenge={codeChallenge}
          userPoolClientId={userPoolClientId}
          onAdded={redirect}
          onBack={() => setMode('default')}
        />
      )}
    </div>
  );
};

export default Authorize;
