import { Portal } from '../Portal';
import styles from './Loading.module.css';

export const Loading = (props: { visible: boolean }) => {
  return props.visible ? (
    <Portal>
      <div className={styles.container}>
        <div className={styles.loader} />
      </div>
    </Portal>
  ) : null;
};
