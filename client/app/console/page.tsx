'use client';

import type { ListUsersResponse } from '@aws-sdk/client-cognito-identity-provider';
import { ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { UserEntity } from 'common/types/user';
import { useCognitoClient } from 'hooks/useCognitoClient';
import { Layout } from 'layouts/Layout';
import { useEffect, useState } from 'react';
import { catchApiErr } from 'utils/catchApiErr';
import styles from './page.module.css';

const Main = (_: { user: UserEntity }) => {
  const { defaults, cognitoClient } = useCognitoClient();
  const [users, setUsers] = useState<ListUsersResponse['Users']>();

  useEffect(() => {
    cognitoClient
      .send(new ListUsersCommand({ UserPoolId: defaults.userPoolId }))
      .then((res) => setUsers(res.Users))
      .catch(catchApiErr);
  }, [defaults, cognitoClient]);

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.card}>
          <table>
            <caption>User List</caption>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.Username}>
                  <td>{user.Attributes?.find((attr) => attr.Name === 'name')?.Value}</td>
                  <td>{user.Username}</td>
                  <td>{user.Attributes?.find((attr) => attr.Name === 'email')?.Value}</td>
                  <td>{user.UserStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Console = () => {
  return <Layout render={(user) => <Main user={user} />} />;
};

export default Console;
