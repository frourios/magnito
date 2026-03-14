import { useAlert } from 'components/Alert/useAlert';
import { useUser } from 'components/Auth/useUser';
import { useConfirm } from 'components/Confirm/useConfirm';
import { Loading } from 'components/Loading/Loading';
import { useLoading } from 'components/Loading/useLoading';
import { BasicHeader } from 'layouts/BasicHeader/BasicHeader';
import { useRouter } from 'next/navigation';
import React from 'react';
import type { UserDto } from 'schemas/user';
import { pagesPath } from 'utils/$path';

export const Layout = (props: { render: (user: UserDto) => React.ReactNode }) => {
  const router = useRouter();
  const { user } = useUser();
  const { loadingElm } = useLoading();
  const { alertElm } = useAlert();
  const { confirmElm } = useConfirm();

  if (!user.inited) {
    return <Loading visible />;
  } else if (user.data === null) {
    void router.replace(pagesPath.login.$url().path);

    return <Loading visible />;
  }

  return (
    <div>
      <BasicHeader user={user.data} />
      {props.render(user.data)}
      {loadingElm}
      {alertElm}
      {confirmElm}
    </div>
  );
};
