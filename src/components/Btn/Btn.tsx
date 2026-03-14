import styles from './Btn.module.css';

export const Btn = (props: {
  text: string;
  size?: 'small' | 'large';
  disabled?: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      disabled={props.disabled}
      className={[
        styles.btn,
        props.size === 'small' ? styles.small : styles.large,
        props.disabled ? styles.disabled : styles.enabled,
      ].join(' ')}
      onClick={props.onClick}
    >
      {props.text}
    </button>
  );
};
