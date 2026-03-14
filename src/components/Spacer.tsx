type Props = { axis: 'x' | 'y'; size: number };

const getHeight = ({ axis, size }: Props) => (axis === 'x' ? 1 : size);
const getWidth = ({ axis, size }: Props) => (axis === 'y' ? 1 : size);

export const Spacer = (props: Props) => {
  return (
    <span
      style={{
        display: `${props.axis === 'x' ? 'inline-' : ''}block`,
        width: `${getWidth(props)}px`,
        minWidth: `${getWidth(props)}px`,
        height: `${getHeight(props)}px`,
        minHeight: `${getHeight(props)}px`,
      }}
    />
  );
};
