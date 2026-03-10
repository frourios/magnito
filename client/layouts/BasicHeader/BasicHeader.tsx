import { AccountSettings } from '@aws-amplify/ui-react';
import { signOut } from 'aws-amplify/auth';
import { APP_NAME } from 'common/constants';
import type { UserEntity } from 'common/types/user';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'components/Modal/Modal';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { APP_VERSION } from 'utils/clientEnvs';
import { YourProfile } from './YourProfile';
import styles from './BasicHeader.module.css';

const Menu = ({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  useEffect(() => {
    const handler = () => open && setTimeout(onClose, 0);
    window.addEventListener('click', handler, true);

    return () => window.removeEventListener('click', handler, true);
  }, [open, onClose]);

  return open && <div className={styles.menu}>{children}</div>;
};

const MenuItem = (props: { onClick: () => void; children: ReactNode }) => {
  return (
    <div className={styles.menuItem} onClick={props.onClick}>
      {props.children}
    </div>
  );
};

export const BasicHeader = (props: { user: UserEntity }) => {
  const [openProfile, setOpenProfile] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <span>
          {APP_NAME} {APP_VERSION}
        </span>
        <div className={styles.userBtn} onClick={(e) => setAnchorEl(e.currentTarget)}>
          {props.user.name}
        </div>
        <Menu open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={() => setOpenProfile(true)}>プロフィール</MenuItem>
          {props.user.kind === 'cognito' && (
            <MenuItem onClick={() => setOpenPassword(true)}>パスワードを変更</MenuItem>
          )}
          <MenuItem onClick={signOut}>ログアウト</MenuItem>
        </Menu>
      </div>
      {openProfile && <YourProfile user={props.user} onClose={() => setOpenProfile(false)} />}
      <Modal open={openPassword} onClose={() => setOpenPassword(false)}>
        <ModalHeader text="パスワードの変更" />
        <ModalBody>
          <AccountSettings.ChangePassword
            onSuccess={signOut}
            displayText={{
              currentPasswordFieldLabel: '現在のパスワード',
              newPasswordFieldLabel: '新しいパスワード',
              confirmPasswordFieldLabel: '新しいパスワードの確認',
              updatePasswordButtonText: 'パスワードを変更',
            }}
          />
        </ModalBody>
        <ModalFooter cancelText="閉じる" cancel={() => setOpenPassword(false)} />
      </Modal>
    </div>
  );
};
