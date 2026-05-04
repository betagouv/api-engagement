import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}

export default function Modal({ open, children, onClose, title, ...props }: ModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
      aria-hidden={!open}
      data-fr-opened={open}
      className={`fr-modal${open ? " fr-modal--opened" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      {...props}
    >
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button type="button" onClick={onClose} title="Fermer" aria-label="Fermer" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h2 id={titleId} className="fr-modal__title">
                  <span className="fr-icon-arrow-right-line fr-icon--lg" aria-hidden="true" />
                  {title}
                </h2>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
