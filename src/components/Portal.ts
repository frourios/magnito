import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

export const Portal = ({ children }: { children: ReactNode }) => {
  const [el, setEl] = useState<HTMLDivElement>();

  useEffect(() => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    setEl(el);

    return () => {
      document.body.removeChild(el);
    };
  }, []);

  return el ? ReactDOM.createPortal(children, el) : null;
};
