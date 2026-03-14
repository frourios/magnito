import { useRouter } from 'next/navigation';
import React from 'react';
import { useAlert } from 'src/components/Alert/useAlert';
import { useUser } from 'src/components/Auth/useUser';
import { useConfirm } from 'src/components/Confirm/useConfirm';
import { Loading } from 'src/components/Loading/Loading';
import { useLoading } from 'src/components/Loading/useLoading';
import { BasicHeader } from 'src/layouts/BasicHeader/BasicHeader';
import type { UserDto } from 'src/schemas/user';
import { pagesPath } from 'src/utils/$path';

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
