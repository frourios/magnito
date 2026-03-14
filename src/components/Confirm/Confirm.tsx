import { Modal, ModalBody, ModalFooter } from 'src/components/Modal/Modal';

export const Confirm = (props: { text: string; ok: () => void; cancel: () => void }) => {
  return (
    <Modal open onClose={props.cancel}>
      <ModalBody>
        <div style={{ whiteSpace: 'pre-wrap' }}>{props.text}</div>
      </ModalBody>
      <ModalFooter cancel={props.cancel} okText="OK" ok={props.ok} />
    </Modal>
  );
};
