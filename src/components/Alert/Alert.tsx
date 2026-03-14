import { Modal, ModalBody, ModalFooter } from 'src/components/Modal/Modal';

export const Alert = (props: { text: string; ok: () => void }) => {
  return (
    <Modal open onClose={props.ok}>
      <ModalBody>
        <div style={{ whiteSpace: 'pre-wrap' }}>{props.text}</div>
      </ModalBody>
      <ModalFooter okText="OK" ok={props.ok} />
    </Modal>
  );
};
