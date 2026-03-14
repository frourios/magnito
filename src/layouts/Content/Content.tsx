import type { ReactNode } from 'react';
import styles from './Content.module.css';

export const Content = (props: { width?: number; children: ReactNode }) => {
  return (
    <div className={styles.content} style={{ width: props.width ?? 1000 }}>
      {props.children}
    </div>
  );
};
